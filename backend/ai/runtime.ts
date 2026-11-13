import { describeAiConfig, loadAiConfig, type AiConfig } from './config.js';
import { AiError, AiErrorCodes, aiConfigError, aiDisabledError } from './errors.js';
import { OpenAICompatibleProvider } from './provider.js';
import { KnowledgeService } from './rag/knowledgeService.js';
import { seedBuiltInKnowledge } from './rag/seed.js';
import { RxDbVectorStore } from './rag/vectorStore.js';
import { createToolRegistry } from './tools/index.js';
import { WaitressAgent } from './agent.js';
import type { LLMProvider } from './types.js';
import type { ToolRegistry } from './toolRegistry.js';

export interface AiRuntime {
  config: AiConfig;
  provider: LLMProvider;
  registry: ToolRegistry;
  knowledge: KnowledgeService | null;
  agent: WaitressAgent;
}

type InitStatus = 'disabled' | 'ready' | 'error';

let runtime: AiRuntime | null = null;
let initPromise: Promise<AiRuntime | null> | null = null;
let initStatus: InitStatus = 'disabled';
let initError: string | null = null;
let initConfig: AiConfig | null = null;

const initialize = async (options: { seedKnowledge?: boolean }): Promise<AiRuntime | null> => {
  try {
    const config = loadAiConfig();
    initConfig = config;
    if (!config.enabled) {
      initStatus = 'disabled';
      initError = null;
      return null;
    }
    if (!config.llm) {
      throw aiConfigError('The LLM provider is not fully configured.');
    }

    const provider = new OpenAICompatibleProvider({
      baseUrl: config.llm.baseUrl,
      apiKey: config.llm.apiKey,
      model: config.llm.model,
      embeddingModel: config.embeddings?.model ?? null,
      timeoutMs: config.llm.timeoutMs,
      embeddingTimeoutMs: config.embeddings?.timeoutMs,
      temperature: config.llm.temperature,
    });

    const knowledge =
      config.rag.enabled && config.embeddings
        ? new KnowledgeService({
            store: new RxDbVectorStore(),
            embed: (texts, signal) => provider.embed(texts, signal),
            config: {
              enabled: true,
              chunkSize: config.rag.chunkSize,
              chunkOverlap: config.rag.chunkOverlap,
              topK: config.rag.topK,
              minScore: config.rag.minScore,
              maxChunks: config.rag.maxChunks,
              embeddingModel: config.embeddings.model,
            },
          })
        : null;

    const registry = createToolRegistry({ config, knowledge });
    const agent = new WaitressAgent(provider, registry, {
      maxIterations: config.maxIterations,
      maxToolCallsPerTurn: config.maxToolCallsPerTurn,
      maxToolResultChars: config.maxToolResultChars,
    });

    runtime = { config, provider, registry, knowledge, agent };

    if (knowledge && (config.rag.autoSeed || options.seedKnowledge)) {
      try {
        const existing = await knowledge.listDocuments();
        if (existing.length === 0 || existing.every((doc) => doc.embeddingStatus === 'failed')) {
          const results = await seedBuiltInKnowledge(knowledge);
          const failed = results.filter((result) => result.document.embeddingStatus === 'failed');
          console.log(
            `AI knowledge seeded: ${results.length - failed.length}/${results.length} document(s) indexed`,
          );
          if (failed.length > 0) {
            console.warn('AI knowledge seeding had embedding failures; re-index is required.');
          }
        }
      } catch (error) {
        console.warn(
          `AI knowledge seeding skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    initStatus = 'ready';
    initError = null;
    return runtime;
  } catch (error) {
    initStatus = 'error';
    initError =
      error instanceof AiError ? error.message : 'AI initialization failed. Check the server logs.';
    console.error(`AI initialization failed: ${initError}`);
    return null;
  }
};

export const initializeAi = async (
  options: { seedKnowledge?: boolean } = {},
): Promise<AiRuntime | null> => {
  if (runtime) return runtime;
  if (initPromise) return initPromise;
  initPromise = initialize(options).finally(() => {
    initPromise = null;
  });
  return initPromise;
};

export const requireAiRuntime = async (): Promise<AiRuntime> => {
  const current = runtime ?? (await initializeAi());
  if (current) return current;
  if (initStatus === 'disabled') throw aiDisabledError();
  throw aiConfigError(initError ?? 'The AI assistant is not configured correctly.');
};

export const getAiStatus = async () => {
  const current = runtime ?? (await initializeAi());
  const config = current?.config ?? initConfig;
  return {
    status: initStatus,
    error: initStatus === 'error' ? initError : null,
    ...(config ? describeAiConfig(config) : { enabled: false }),
    knowledgeChunks: null as number | null,
  };
};

/** Test hook: discard the singleton and re-read environment configuration. */
export const resetAiRuntime = (): void => {
  runtime = null;
  initPromise = null;
  initStatus = 'disabled';
  initError = null;
  initConfig = null;
};
