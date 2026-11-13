import { AiError, AiErrorCodes } from '../ai/errors.js';
import { describeAiConfig, loadAiConfig } from '../ai/config.js';

const env = (values: Record<string, string>): NodeJS.ProcessEnv => values as NodeJS.ProcessEnv;

describe('AI config', () => {
  it('defaults to disabled without requiring provider credentials', () => {
    const config = loadAiConfig(env({}));
    expect(config.enabled).toBe(false);
    expect(config.llm).toBeUndefined();
    expect(config.embeddings).toBeUndefined();
    expect(config.rag.enabled).toBe(false);
    expect(config.restaurantTimeZone).toBe('UTC');
    expect(config.maxIterations).toBeGreaterThan(0);
  });

  it('builds a valid enabled config and falls back to LLM credentials for embeddings', () => {
    const config = loadAiConfig(
      env({
        AI_ENABLED: 'true',
        AI_LLM_BASE_URL: 'https://api.openai.com/v1/',
        AI_LLM_API_KEY: 'super-secret-key',
        AI_LLM_MODEL: 'gpt-test',
        AI_EMBEDDING_MODEL: 'embed-test',
        AI_RESTAURANT_TIMEZONE: 'Europe/Rome',
        AI_RAG_TOP_K: '3',
      }),
    );
    expect(config.enabled).toBe(true);
    expect(config.llm).toMatchObject({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-test',
      apiKey: 'super-secret-key',
    });
    expect(config.embeddings).toMatchObject({
      baseUrl: 'https://api.openai.com/v1',
      model: 'embed-test',
      apiKey: 'super-secret-key',
    });
    expect(config.rag).toMatchObject({ enabled: true, topK: 3 });
    expect(config.restaurantTimeZone).toBe('Europe/Rome');

    const summary = JSON.stringify(describeAiConfig(config));
    expect(summary).not.toContain('super-secret-key');
    expect(describeAiConfig(config)).toMatchObject({
      enabled: true,
      llmConfigured: true,
      llmModel: 'gpt-test',
      embeddingsConfigured: true,
    });
  });

  it('rejects enabled configuration without a base URL or model', () => {
    try {
      loadAiConfig(env({ AI_ENABLED: 'true' }));
      throw new Error('expected config validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AiError);
      expect((error as AiError).code).toBe(AiErrorCodes.AI_CONFIG_INVALID);
      expect((error as AiError).status).toBe(503);
      expect((error as AiError).message).toContain('AI_LLM_BASE_URL');
      expect((error as AiError).message).toContain('AI_LLM_MODEL');
    }
  });

  it('rejects invalid URLs, chunk overlap and time zones', () => {
    expect(() =>
      loadAiConfig(
        env({
          AI_ENABLED: 'true',
          AI_LLM_BASE_URL: 'not-a-url',
          AI_LLM_MODEL: 'm',
        }),
      ),
    ).toThrow(AiError);

    expect(() =>
      loadAiConfig(
        env({
          AI_RAG_CHUNK_SIZE: '200',
          AI_RAG_CHUNK_OVERLAP: '200',
        }),
      ),
    ).toThrow(AiError);

    expect(() => loadAiConfig(env({ AI_RESTAURANT_TIMEZONE: 'Mars/Olympus' }))).toThrow(AiError);
  });
});
