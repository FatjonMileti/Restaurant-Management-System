import { z } from 'zod';
import { AiError, AiErrorCodes } from './errors.js';

const truthy = new Set(['true', '1', 'yes', 'on']);
const falsy = new Set(['false', '0', 'no', 'off']);

const booleanEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase();
    if (truthy.has(normalized)) return true;
    if (falsy.has(normalized)) return false;
    return value;
  }, z.boolean().default(defaultValue));

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().url('must be an absolute http(s) URL').optional());

const intEnv = (defaultValue: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().int().min(min).max(max).default(defaultValue),
  );

const numberEnv = (defaultValue: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().min(min).max(max).default(defaultValue),
  );

export const aiEnvSchema = z
  .object({
    AI_ENABLED: booleanEnv(false),

    // OpenAI-compatible API base, e.g. https://api.openai.com/v1 or
    // http://localhost:11434/v1. The provider appends /chat/completions.
    AI_LLM_BASE_URL: optionalUrl,
    AI_LLM_API_KEY: optionalString,
    AI_LLM_MODEL: optionalString,
    AI_LLM_TIMEOUT_MS: intEnv(30000, 1000, 180000),
    AI_LLM_TEMPERATURE: numberEnv(0.2, 0, 2),

    AI_MAX_ITERATIONS: intEnv(5, 1, 12),
    AI_MAX_TOOL_CALLS_PER_TURN: intEnv(4, 1, 12),
    AI_TOOL_TIMEOUT_MS: intEnv(10000, 500, 60000),
    AI_REQUEST_TIMEOUT_MS: intEnv(60000, 2000, 300000),
    AI_MAX_TOOL_RESULT_CHARS: intEnv(12000, 1000, 60000),
    AI_MAX_HISTORY_MESSAGES: intEnv(12, 2, 40),
    AI_MAX_MESSAGE_CHARS: intEnv(4000, 200, 20000),

    AI_EMBEDDING_BASE_URL: optionalUrl,
    AI_EMBEDDING_API_KEY: optionalString,
    AI_EMBEDDING_MODEL: optionalString,
    AI_EMBEDDING_TIMEOUT_MS: intEnv(30000, 1000, 180000),

    AI_RAG_ENABLED: booleanEnv(true),
    AI_RAG_TOP_K: intEnv(5, 1, 20),
    AI_RAG_MIN_SCORE: numberEnv(0.2, -1, 1),
    AI_RAG_CHUNK_SIZE: intEnv(800, 100, 8000),
    AI_RAG_CHUNK_OVERLAP: intEnv(120, 0, 2000),
    AI_RAG_MAX_CHUNKS: intEnv(5000, 10, 100000),
    AI_AUTO_SEED_KNOWLEDGE: booleanEnv(false),

    AI_RESTAURANT_TIMEZONE: z.string().min(1).default('UTC'),
    AI_MAX_PARTY_SIZE: intEnv(20, 1, 100),
    AI_DRAFT_TTL_MS: intEnv(15 * 60 * 1000, 60000, 60 * 60 * 1000),

    AI_RATE_LIMIT_WINDOW_MS: intEnv(60000, 1000, 3600000),
    AI_RATE_LIMIT_MAX: intEnv(20, 1, 1000),
    AI_CONFIRM_RATE_LIMIT_MAX: intEnv(10, 1, 200),
    AI_ADMIN_RATE_LIMIT_MAX: intEnv(30, 1, 500),
  })
  .superRefine((value, ctx) => {
    if (value.AI_ENABLED && !value.AI_LLM_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_LLM_BASE_URL'],
        message: 'AI_LLM_BASE_URL is required when AI_ENABLED=true',
      });
    }
    if (value.AI_ENABLED && !value.AI_LLM_MODEL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_LLM_MODEL'],
        message: 'AI_LLM_MODEL is required when AI_ENABLED=true',
      });
    }
    if (value.AI_RAG_CHUNK_OVERLAP >= value.AI_RAG_CHUNK_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_RAG_CHUNK_OVERLAP'],
        message: 'AI_RAG_CHUNK_OVERLAP must be smaller than AI_RAG_CHUNK_SIZE',
      });
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value.AI_RESTAURANT_TIMEZONE }).format();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_RESTAURANT_TIMEZONE'],
        message: 'AI_RESTAURANT_TIMEZONE must be a valid IANA time zone',
      });
    }
  });

export type AiEnv = z.infer<typeof aiEnvSchema>;

export interface LlmConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  temperature: number;
}

export interface EmbeddingConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
}

export interface AiConfig {
  enabled: boolean;
  llm?: LlmConfig;
  embeddings?: EmbeddingConfig;
  rag: {
    enabled: boolean;
    topK: number;
    minScore: number;
    chunkSize: number;
    chunkOverlap: number;
    maxChunks: number;
    autoSeed: boolean;
  };
  maxIterations: number;
  maxToolCallsPerTurn: number;
  toolTimeoutMs: number;
  requestTimeoutMs: number;
  maxToolResultChars: number;
  maxHistoryMessages: number;
  maxMessageChars: number;
  restaurantTimeZone: string;
  maxPartySize: number;
  draftTtlMs: number;
  limits: {
    windowMs: number;
    chatMax: number;
    confirmMax: number;
    adminMax: number;
  };
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

/** Build the validated runtime config. Throws AiError with safe details. */
export const loadAiConfig = (env: NodeJS.ProcessEnv = process.env): AiConfig => {
  const parsed = aiEnvSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'config');
    throw new AiError(
      AiErrorCodes.AI_CONFIG_INVALID,
      `Invalid AI configuration: ${[...new Set(fields)].join(', ')}`,
      503,
    );
  }
  const value = parsed.data;

  const llm =
    value.AI_ENABLED && value.AI_LLM_BASE_URL && value.AI_LLM_MODEL
      ? {
          baseUrl: normalizeBaseUrl(value.AI_LLM_BASE_URL),
          apiKey: value.AI_LLM_API_KEY,
          model: value.AI_LLM_MODEL,
          timeoutMs: value.AI_LLM_TIMEOUT_MS,
          temperature: value.AI_LLM_TEMPERATURE,
        }
      : undefined;

  const embeddingBase = value.AI_EMBEDDING_BASE_URL ?? value.AI_LLM_BASE_URL;
  const embeddings =
    value.AI_ENABLED && value.AI_RAG_ENABLED && embeddingBase && value.AI_EMBEDDING_MODEL
      ? {
          baseUrl: normalizeBaseUrl(embeddingBase),
          apiKey: value.AI_EMBEDDING_API_KEY ?? value.AI_LLM_API_KEY,
          model: value.AI_EMBEDDING_MODEL,
          timeoutMs: value.AI_EMBEDDING_TIMEOUT_MS,
        }
      : undefined;

  return {
    enabled: value.AI_ENABLED,
    llm,
    embeddings,
    rag: {
      enabled: value.AI_ENABLED && value.AI_RAG_ENABLED && Boolean(embeddings),
      topK: value.AI_RAG_TOP_K,
      minScore: value.AI_RAG_MIN_SCORE,
      chunkSize: value.AI_RAG_CHUNK_SIZE,
      chunkOverlap: value.AI_RAG_CHUNK_OVERLAP,
      maxChunks: value.AI_RAG_MAX_CHUNKS,
      autoSeed: value.AI_AUTO_SEED_KNOWLEDGE,
    },
    maxIterations: value.AI_MAX_ITERATIONS,
    maxToolCallsPerTurn: value.AI_MAX_TOOL_CALLS_PER_TURN,
    toolTimeoutMs: value.AI_TOOL_TIMEOUT_MS,
    requestTimeoutMs: value.AI_REQUEST_TIMEOUT_MS,
    maxToolResultChars: value.AI_MAX_TOOL_RESULT_CHARS,
    maxHistoryMessages: value.AI_MAX_HISTORY_MESSAGES,
    maxMessageChars: value.AI_MAX_MESSAGE_CHARS,
    restaurantTimeZone: value.AI_RESTAURANT_TIMEZONE,
    maxPartySize: value.AI_MAX_PARTY_SIZE,
    draftTtlMs: value.AI_DRAFT_TTL_MS,
    limits: {
      windowMs: value.AI_RATE_LIMIT_WINDOW_MS,
      chatMax: value.AI_RATE_LIMIT_MAX,
      confirmMax: value.AI_CONFIRM_RATE_LIMIT_MAX,
      adminMax: value.AI_ADMIN_RATE_LIMIT_MAX,
    },
  };
};

let cachedConfig: AiConfig | null = null;

export const getAiConfig = (): AiConfig => {
  if (!cachedConfig) cachedConfig = loadAiConfig();
  return cachedConfig;
};

/** Test/ops hook: clear the cached env-derived config. */
export const resetAiConfig = (): void => {
  cachedConfig = null;
};

/** Safe config summary for health/status endpoints. Never includes keys. */
export const describeAiConfig = (config: AiConfig) => ({
  enabled: config.enabled,
  llmConfigured: Boolean(config.llm),
  llmModel: config.llm?.model ?? null,
  embeddingsConfigured: Boolean(config.embeddings),
  embeddingModel: config.embeddings?.model ?? null,
  ragEnabled: config.rag.enabled,
  restaurantTimeZone: config.restaurantTimeZone,
});
