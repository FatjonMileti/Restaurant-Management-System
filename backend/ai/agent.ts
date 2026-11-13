import type {
  AgentArtifacts,
  AgentResult,
  ChatMessage,
  Citation,
  LLMProvider,
  MenuItemArtifact,
  ToolContext,
  ToolTrace,
} from './types.js';
import type { ToolRegistry } from './toolRegistry.js';

export interface AgentOptions {
  maxIterations: number;
  maxToolCallsPerTurn: number;
  maxToolResultChars: number;
}

export interface AgentRunInput {
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  context: ToolContext;
  signal?: AbortSignal;
}

const emptyArtifacts = (): AgentArtifacts => ({
  menuItems: [],
  citations: [],
  draft: null,
  availability: null,
});

const sanitizeMenuArtifact = (item: any): MenuItemArtifact | null => {
  if (!item || typeof item.name !== 'string' || typeof item.price !== 'number') return null;
  const menuItemId = item.menuItemId ?? item.id ?? item._id;
  if (typeof menuItemId !== 'string' || !menuItemId) return null;
  return {
    menuItemId,
    name: item.name,
    description: typeof item.description === 'string' ? item.description : '',
    price: item.price,
    category: typeof item.category === 'string' ? item.category : '',
    image: typeof item.image === 'string' ? item.image : '',
    available: item.available !== false,
  };
};

const sanitizeCitation = (citation: any): Citation | null => {
  if (
    !citation ||
    typeof citation.chunkId !== 'string' ||
    typeof citation.documentId !== 'string' ||
    typeof citation.title !== 'string' ||
    typeof citation.excerpt !== 'string'
  ) {
    return null;
  }
  return {
    chunkId: citation.chunkId,
    documentId: citation.documentId,
    title: citation.title,
    sourceType: typeof citation.sourceType === 'string' ? citation.sourceType : 'document',
    chunkIndex: typeof citation.chunkIndex === 'number' ? citation.chunkIndex : 0,
    excerpt: citation.excerpt,
    score: typeof citation.score === 'number' ? citation.score : 0,
  };
};

const serializeToolResult = (result: unknown, maxChars: number): string => {
  let text: string;
  try {
    text = JSON.stringify(result);
  } catch {
    text = JSON.stringify({
      ok: false,
      error: { code: 'SERIALIZATION_FAILED', message: 'The tool result was not readable.' },
    });
  }
  if (text.length <= maxChars) return text;
  return JSON.stringify({
    ok: (result as any)?.ok ?? false,
    truncated: true,
    note: 'Tool output was truncated to stay within the assistant context limit.',
    preview: text.slice(0, Math.max(0, maxChars - 300)),
  });
};

export class WaitressAgent {
  private readonly provider: LLMProvider;
  private readonly registry: ToolRegistry;
  private readonly options: AgentOptions;

  constructor(provider: LLMProvider, registry: ToolRegistry, options: AgentOptions) {
    this.provider = provider;
    this.registry = registry;
    this.options = options;
  }

  async run(input: AgentRunInput): Promise<AgentResult> {
    const artifacts = emptyArtifacts();
    const traces: ToolTrace[] = [];
    const messages: ChatMessage[] = [
      { role: 'system', content: input.systemPrompt },
      ...input.history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: 'user', content: input.userMessage },
    ];

    for (let iteration = 0; iteration < this.options.maxIterations; iteration += 1) {
      const turn = await this.provider.chat({
        messages,
        tools: this.registry.definitionsFor(input.context),
        signal: input.signal,
      });

      if (turn.toolCalls.length === 0) {
        return {
          content: turn.content?.trim() || 'I could not produce an answer. Please try rephrasing.',
          toolCalls: traces,
          artifacts,
          iterations: iteration + 1,
          truncated: false,
        };
      }

      messages.push({
        role: 'assistant',
        content: turn.content,
        tool_calls: turn.toolCalls,
      });

      const allowed = turn.toolCalls.slice(0, this.options.maxToolCallsPerTurn);
      const rejected = turn.toolCalls.slice(this.options.maxToolCallsPerTurn);

      for (const call of allowed) {
        const started = Date.now();
        const result = await this.registry.dispatch(
          call.function.name,
          call.function.arguments,
          input.context,
        );
        const durationMs = Date.now() - started;
        traces.push({
          name: call.function.name,
          ok: result.ok,
          durationMs,
          ...(result.ok ? {} : { errorCode: result.error?.code }),
        });
        if (result.ok) this.collectArtifacts(call.function.name, result.data, artifacts);

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: serializeToolResult(result, this.options.maxToolResultChars),
        });
      }

      for (const call of rejected) {
        traces.push({
          name: call.function.name,
          ok: false,
          durationMs: 0,
          errorCode: 'TOO_MANY_TOOL_CALLS',
        });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify({
            ok: false,
            error: {
              code: 'TOO_MANY_TOOL_CALLS',
              message: 'Too many tool calls in one turn. Continue with the results already provided.',
            },
          }),
        });
      }
    }

    return {
      content:
        'I could not finish checking that within the allowed number of steps. Please try a narrower question so I can help safely.',
      toolCalls: traces,
      artifacts,
      iterations: this.options.maxIterations,
      truncated: true,
    };
  }

  private collectArtifacts(toolName: string, data: any, artifacts: AgentArtifacts): void {
    if (!data) return;

    if (toolName === 'search_menu' && Array.isArray(data.items)) {
      for (const item of data.items) {
        const artifact = sanitizeMenuArtifact(item);
        if (artifact && !artifacts.menuItems.some((m) => m.menuItemId === artifact.menuItemId)) {
          artifacts.menuItems.push(artifact);
        }
      }
    }

    if (toolName === 'get_menu_item_details' && data.item) {
      const artifact = sanitizeMenuArtifact(data.item);
      if (artifact && !artifacts.menuItems.some((m) => m.menuItemId === artifact.menuItemId)) {
        artifacts.menuItems.push(artifact);
      }
    }

    if (
      toolName === 'check_reservation_availability' ||
      toolName === 'prepare_reservation_draft'
    ) {
      const availability = toolName === 'prepare_reservation_draft' ? data.availability : data;
      if (availability && typeof availability.available === 'boolean') {
        artifacts.availability = availability;
      }
    }

    if (
      (toolName === 'prepare_order_draft' || toolName === 'prepare_reservation_draft') &&
      data.draft
    ) {
      artifacts.draft = data.draft;
    }

    if (toolName === 'search_restaurant_knowledge' && Array.isArray(data.results)) {
      for (const raw of data.results) {
        const citation = sanitizeCitation(raw);
        if (citation && !artifacts.citations.some((c) => c.chunkId === citation.chunkId)) {
          artifacts.citations.push(citation);
        }
      }
    }

    artifacts.menuItems = artifacts.menuItems.slice(0, 20);
    artifacts.citations = artifacts.citations.slice(0, 10);
  }
}
