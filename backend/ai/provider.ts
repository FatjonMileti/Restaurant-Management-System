import { z } from 'zod';
import {
  AiError,
  AiErrorCodes,
  providerResponseError,
  providerTimeoutError,
  providerUnavailableError,
  ragUnavailableError,
} from './errors.js';
import type { AssistantTurn, ChatRequest, LLMProvider, ToolCall } from './types.js';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  embeddingModel?: string | null;
  timeoutMs: number;
  embeddingTimeoutMs?: number;
  temperature?: number;
  fetchImpl?: FetchLike;
}

interface TimeoutHandle {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
}

const createTimeoutSignal = (timeoutMs: number, parent?: AbortSignal): TimeoutHandle => {
  const controller = new AbortController();
  let timedOut = false;

  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
    timedOut: () => timedOut,
  };
};

const normalizeToolCall = (raw: any): ToolCall | null => {
  const fn = raw?.function;
  if (!fn || typeof fn.name !== 'string' || !fn.name) return null;
  let args: string;
  if (typeof fn.arguments === 'string') args = fn.arguments;
  else if (fn.arguments && typeof fn.arguments === 'object') args = JSON.stringify(fn.arguments);
  else args = '{}';
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : `tool_${Date.now()}`,
    type: 'function',
    function: { name: fn.name, arguments: args },
  };
};

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.union([z.string(), z.null()]).optional(),
          tool_calls: z.array(z.any()).optional(),
        }),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

const embeddingResponseSchema = z.object({
  data: z
    .array(
      z.object({
        embedding: z.array(z.number()),
        index: z.number().int().optional(),
      }),
    )
    .min(1),
});

/**
 * Minimal OpenAI-compatible client. Works with hosted OpenAI-style APIs and
 * local Ollama's `/v1` compatibility endpoint. No SDK dependency.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly chatModel: string;
  readonly embeddingModel: string | null;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly embeddingTimeoutMs: number;
  private readonly temperature: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: ProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.chatModel = options.model;
    this.embeddingModel = options.embeddingModel ?? null;
    this.timeoutMs = options.timeoutMs;
    this.embeddingTimeoutMs = options.embeddingTimeoutMs ?? options.timeoutMs;
    this.temperature = options.temperature ?? 0.2;
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private async post(path: string, body: unknown, timeoutMs: number, parent?: AbortSignal) {
    const timeout = createTimeoutSignal(timeoutMs, parent);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: timeout.signal,
      });
    } catch (error) {
      if (timeout.timedOut()) throw providerTimeoutError();
      if (parent?.aborted) {
        throw new AiError(AiErrorCodes.INTERNAL, 'The AI request was cancelled.', 499);
      }
      throw providerUnavailableError();
    } finally {
      timeout.cleanup();
    }

    if (!response.ok) {
      // Never forward provider bodies: they can contain request ids or echo
      // unsafe content. Logging is intentionally status-only.
      if (response.status === 429 || response.status >= 500) {
        throw providerUnavailableError('The AI service is busy. Please try again shortly.');
      }
      if (response.status === 401 || response.status === 403) {
        throw providerUnavailableError('The AI service rejected its configured credentials.');
      }
      if (response.status === 408) throw providerTimeoutError();
      throw providerResponseError();
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw providerResponseError();
    }
  }

  async chat(request: ChatRequest): Promise<AssistantTurn> {
    const body: Record<string, unknown> = {
      model: this.chatModel,
      messages: request.messages,
      temperature: request.temperature ?? this.temperature,
    };
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
      body.tool_choice = 'auto';
    }
    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }

    const payload = await this.post('/chat/completions', body, this.timeoutMs, request.signal);
    const parsed = chatResponseSchema.safeParse(payload);
    if (!parsed.success) throw providerResponseError();

    const choice = parsed.data.choices[0];
    const message = choice.message;
    const toolCalls = (message.tool_calls ?? [])
      .map(normalizeToolCall)
      .filter((call): call is ToolCall => call !== null);
    const content = typeof message.content === 'string' ? message.content.trim() : '';

    if (!content && toolCalls.length === 0) throw providerResponseError();

    return {
      content: content || null,
      toolCalls,
      finishReason: choice.finish_reason ?? undefined,
    };
  }

  async embed(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    if (!this.embeddingModel) throw ragUnavailableError('Embeddings are not configured.');
    if (texts.length === 0) return [];

    const payload = await this.post(
      '/embeddings',
      { model: this.embeddingModel, input: texts },
      this.embeddingTimeoutMs,
      signal,
    );
    const parsed = embeddingResponseSchema.safeParse(payload);
    if (!parsed.success) throw providerResponseError();

    const rows = [...parsed.data.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    if (rows.length !== texts.length) throw providerResponseError();

    const dimension = rows[0]?.embedding.length ?? 0;
    if (dimension === 0) throw providerResponseError();
    for (const row of rows) {
      if (row.embedding.length !== dimension || row.embedding.some((n) => !Number.isFinite(n))) {
        throw providerResponseError();
      }
    }
    return rows.map((row) => row.embedding);
  }
}
