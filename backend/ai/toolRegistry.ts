import type { z } from 'zod';
import { AppError } from '../graphql/errors.js';
import { AiError, AiErrorCodes, toolTimeoutError } from './errors.js';
import type { ToolAccess, ToolContext, ToolDefinition, ToolResult } from './types.js';

export interface RegisteredTool<TArgs = unknown> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType<TArgs>;
  access: ToolAccess;
  handler: (args: TArgs, context: ToolContext) => Promise<ToolResult>;
}

const canAccess = (access: ToolAccess, context: ToolContext): boolean => {
  switch (access) {
    case 'public':
      return true;
    case 'authenticated':
      return Boolean(context.userId);
    case 'staff':
      return context.user?.role === 'staff' || context.user?.role === 'admin';
    case 'admin':
      return context.user?.role === 'admin';
    default:
      return false;
  }
};

const safeMessage = (error: unknown): { code: string; message: string } => {
  if (error instanceof AiError) return { code: error.code, message: error.message };
  if (error instanceof AppError) {
    return {
      code: error.code === 'VALIDATION_FAILED' ? 'INVALID_ARGUMENTS' : error.code,
      message: error.message,
    };
  }
  return {
    code: 'TOOL_FAILED',
    message: 'That information could not be retrieved right now.',
  };
};

const runWithTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  toolName: string,
  parentSignal?: AbortSignal,
): Promise<T> => {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(toolTimeoutError(toolName));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
};

/**
 * Allow-list registry. The model may only invoke tools that are registered and
 * permitted for the current caller. Arguments are always parsed with zod before
 * the handler runs; execution is time-bounded.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool<any>>();
  private readonly timeoutMs: number;

  constructor(options: { timeoutMs: number }) {
    this.timeoutMs = options.timeoutMs;
  }

  register<TArgs>(tool: RegisteredTool<TArgs>): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool as RegisteredTool<any>);
    return this;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): RegisteredTool[] {
    return [...this.tools.values()];
  }

  definitionsFor(context: ToolContext): ToolDefinition[] {
    return this.list()
      .filter((tool) => canAccess(tool.access, context))
      .map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
  }

  async dispatch(name: string, rawArguments: unknown, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_TOOL',
          message: `Tool "${name}" is not available. Use only the provided tools.`,
        },
      };
    }

    if (!canAccess(tool.access, context)) {
      return {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'That tool requires a signed-in customer or additional permissions.',
        },
      };
    }

    let parsedArguments: unknown = rawArguments;
    if (typeof rawArguments === 'string') {
      try {
        parsedArguments = rawArguments.trim() === '' ? {} : JSON.parse(rawArguments);
      } catch {
        return {
          ok: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'The tool arguments were not valid JSON.',
          },
        };
      }
    }

    const parsed = tool.schema.safeParse(parsedArguments);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
      return {
        ok: false,
        error: {
          code: 'INVALID_ARGUMENTS',
          message: `Invalid arguments${fields.length ? `: ${fields.join(', ')}` : ''}.`,
        },
      };
    }

    try {
      return await runWithTimeout(
        (signal) => tool.handler(parsed.data, { ...context, signal }),
        this.timeoutMs,
        name,
        context.signal,
      );
    } catch (error) {
      return { ok: false, error: safeMessage(error) };
    }
  }
}

/** Normalize an unexpected registry failure for route-level handling. */
export const registryFailure = (): AiError =>
  new AiError(AiErrorCodes.INTERNAL, 'The assistant could not run that check.', 500);
