jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));
jest.mock('../graphql/helpers/formatters.js', () => ({
  getOrCreateRestaurantSettings: jest.fn(),
}));

import { getDB } from '../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../graphql/helpers/formatters.js';
import { loadAiConfig, describeAiConfig } from '../ai/config.js';
import { AiErrorCodes, providerResponseError, providerTimeoutError } from '../ai/errors.js';
import { requireAiWaiter } from '../ai/middleware.js';
import { loadRestaurantGlossary } from '../ai/interpreter/glossary.js';
import { findInterpreterLanguage, listInterpreterLanguages } from '../ai/interpreter/languages.js';
import { assessSafety, numbersDiffer } from '../ai/interpreter/safety.js';
import { InterpreterService } from '../ai/interpreter/service.js';
import { OpenAICompatibleTranslationProvider } from '../ai/interpreter/translationProvider.js';
import type { TranslationProvider, TranslationProviderOutput } from '../ai/interpreter/types.js';
import type { ChatRequest, LLMProvider } from '../ai/types.js';

const asMock = (value: unknown) => value as jest.Mock;

const providerOutput = (
  overrides: Partial<TranslationProviderOutput> = {},
): TranslationProviderOutput => ({
  translatedText: 'Buongiorno, benvenuti.',
  detectedSourceLanguage: 'sq',
  uncertain: false,
  uncertaintyReasons: [],
  safetySensitive: false,
  ...overrides,
});

const makeService = (provider: TranslationProvider, maxInputChars = 2000) =>
  new InterpreterService({
    provider,
    maxInputChars,
    maxGlossaryItems: 3,
    loadGlossary: async () => ({
      restaurantName: 'Trattoria Test',
      entries: [{ term: 'Tomato Pasta', category: 'main' }],
    }),
  });

describe('interpreter languages', () => {
  it('exposes curated codes with display and speech metadata', () => {
    expect(findInterpreterLanguage('SQ')).toMatchObject({
      code: 'sq',
      name: 'Albanian',
      nativeName: 'Shqip',
      speechLocale: 'sq-AL',
    });
    expect(findInterpreterLanguage('it')).toMatchObject({ code: 'it', name: 'Italian' });
    expect(findInterpreterLanguage('xx')).toBeNull();
    expect(findInterpreterLanguage('')).toBeNull();
    expect(findInterpreterLanguage(null)).toBeNull();

    const languages = listInterpreterLanguages();
    expect(languages.length).toBeGreaterThan(10);
    expect(languages.map((language) => language.name)).toEqual(
      [...languages.map((language) => language.name)].sort((a, b) => a.localeCompare(b)),
    );
  });
});

describe('interpreter config', () => {
  it('is disabled with the rest of AI by default and can use LLM fallbacks', () => {
    const disabled = loadAiConfig({} as NodeJS.ProcessEnv);
    expect(disabled.interpreter.enabled).toBe(false);
    expect(disabled.interpreter.translation).toBeUndefined();

    const enabled = loadAiConfig({
      AI_ENABLED: 'true',
      AI_LLM_BASE_URL: 'https://llm.example/v1/',
      AI_LLM_API_KEY: 'super-secret',
      AI_LLM_MODEL: 'chat-model',
      AI_TRANSLATION_MODEL: 'translation-model',
      AI_TRANSLATION_TIMEOUT_MS: '15000',
      AI_TRANSLATION_MAX_INPUT_CHARS: '1500',
      AI_INTERPRETER_RATE_LIMIT_MAX: '7',
    } as NodeJS.ProcessEnv);

    expect(enabled.interpreter).toMatchObject({
      enabled: true,
      maxInputChars: 1500,
      rateLimitMax: 7,
      translation: {
        baseUrl: 'https://llm.example/v1',
        model: 'translation-model',
        timeoutMs: 15000,
        apiKey: 'super-secret',
      },
    });
    const summary = JSON.stringify(describeAiConfig(enabled));
    expect(summary).not.toContain('super-secret');
    expect(describeAiConfig(enabled)).toMatchObject({
      interpreterEnabled: true,
      translationConfigured: true,
      translationModel: 'translation-model',
    });
  });

  it('honours the interpreter disable switch without requiring a separate provider', () => {
    const config = loadAiConfig({
      AI_ENABLED: 'true',
      AI_INTERPRETER_ENABLED: 'false',
      AI_LLM_BASE_URL: 'https://llm.example/v1',
      AI_LLM_MODEL: 'chat-model',
    } as NodeJS.ProcessEnv);
    expect(config.interpreter.enabled).toBe(false);
    expect(config.interpreter.translation).toBeUndefined();
  });
});

describe('interpreter safety checks', () => {
  it('flags allergies, negation, prices and quantities conservatively', () => {
    const assessment = assessSafety(
      'I am allergic to nuts. No peanuts, and 2 portions at $12.50, not 3.',
    );
    expect(assessment.categories).toContain('allergy_or_dietary');
    expect(assessment.categories).toContain('price_or_quantity');
    expect(assessment.categories).toContain('negation_or_condition');
    expect(assessment.reasons.length).toBeGreaterThan(0);
  });

  it('flags plural allergens and currency symbols attached to numbers', () => {
    expect(assessSafety('Are there nuts in this dish?').categories).toContain(
      'allergy_or_dietary',
    );
    expect(assessSafety('The dish is $12.').categories).toContain('price_or_quantity');
    expect(assessSafety('It costs €9,50.').categories).toContain('price_or_quantity');
    expect(assessSafety('Two coffees, please.').categories).toContain('price_or_quantity');
    expect(assessSafety('Due caffè per favore.').categories).toContain('price_or_quantity');
  });

  it('detects numeric changes without silently accepting them', () => {
    expect(numbersDiffer('2 portions at $12.50', '2 porcione a 12,50 $')).toBe(false);
    expect(numbersDiffer('2 portions at $12.50', '3 porcione a 12,50 $')).toBe(true);
    expect(numbersDiffer('table for 4 at 19:00', 'tavolo per quattro alle 19:00')).toBe(true);
    expect(numbersDiffer('no numbers here', 'nessun numero qui')).toBe(false);
  });
});

describe('InterpreterService', () => {
  it('translates waiter-to-customer with explicit languages and glossary context', async () => {
    const translate = jest.fn().mockResolvedValue(providerOutput());
    const result = await makeService({ name: 'test', translate }).translate({
      text: 'Mirëdita, mirësevini.',
      sourceLanguage: 'sq',
      targetLanguage: 'it',
      direction: 'waiter-to-customer',
    });

    expect(translate).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Mirëdita, mirësevini.',
        direction: 'waiter-to-customer',
        sourceLanguage: expect.objectContaining({ code: 'sq' }),
        targetLanguage: expect.objectContaining({ code: 'it' }),
        glossary: expect.objectContaining({ restaurantName: 'Trattoria Test' }),
      }),
    );
    expect(result).toMatchObject({
      direction: 'waiter-to-customer',
      sourceText: 'Mirëdita, mirësevini.',
      translatedText: 'Buongiorno, benvenuti.',
      sourceLanguage: { code: 'sq', name: 'Albanian', speechLocale: 'sq-AL' },
      targetLanguage: { code: 'it', name: 'Italian', speechLocale: 'it-IT' },
      detectedSourceLanguage: 'sq',
      uncertain: false,
      safetySensitive: false,
      requiresHumanVerification: false,
    });
    expect(result.translationId).toEqual(expect.any(String));
  });

  it('translates customer-to-waiter and preserves allergy details for verification', async () => {
    const translate = jest.fn().mockResolvedValue(
      providerOutput({
        translatedText: 'Jam alergjik ndaj arrave dhe nuk dua kikirikë.',
        detectedSourceLanguage: 'it',
        safetySensitive: true,
      }),
    );
    const result = await makeService({ name: 'test', translate }).translate({
      text: 'Sono allergico alle noci e non voglio arachidi.',
      sourceLanguage: 'it',
      targetLanguage: 'sq',
      direction: 'customer-to-waiter',
    });

    expect(translate).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'customer-to-waiter',
        sourceLanguage: expect.objectContaining({ code: 'it' }),
        targetLanguage: expect.objectContaining({ code: 'sq' }),
      }),
    );
    expect(result.safetySensitive).toBe(true);
    expect(result.requiresHumanVerification).toBe(true);
    expect(result.verificationReasons.join(' ')).toMatch(/allerg/i);
    expect(result.translatedText).toContain('alergjik');
  });

  it('rejects empty, oversized and unsupported language inputs', async () => {
    const service = makeService(
      { name: 'test', translate: jest.fn().mockResolvedValue(providerOutput()) },
      10,
    );

    await expect(
      service.translate({
        text: '   ',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.VALIDATION_FAILED, status: 400 });

    await expect(
      service.translate({
        text: 'This message is much too long',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.VALIDATION_FAILED, status: 400 });

    for (const sourceLanguage of ['xx', '', null]) {
      await expect(
        service.translate({
          text: 'Hello',
          sourceLanguage,
          targetLanguage: 'it',
          direction: 'waiter-to-customer',
        }),
      ).rejects.toMatchObject({ code: AiErrorCodes.VALIDATION_FAILED, status: 400 });
    }

    await expect(
      service.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'zz',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.VALIDATION_FAILED, status: 400 });

    await expect(
      service.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'en',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.VALIDATION_FAILED, status: 400 });
  });

  it('propagates provider timeouts and failures as safe typed errors', async () => {
    const timeoutService = makeService({
      name: 'test',
      translate: jest.fn().mockRejectedValue(providerTimeoutError()),
    });
    await expect(
      timeoutService.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.PROVIDER_TIMEOUT, status: 504 });

    const unavailableService = makeService({
      name: 'test',
      translate: jest.fn().mockRejectedValue(providerResponseError()),
    });
    await expect(
      unavailableService.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.PROVIDER_RESPONSE_INVALID });
  });

  it('rejects empty or oversized provider translations and flags number changes', async () => {
    const emptyService = makeService({
      name: 'test',
      translate: jest.fn().mockResolvedValue(providerOutput({ translatedText: '   ' })),
    });
    await expect(
      emptyService.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      }),
    ).rejects.toMatchObject({ code: AiErrorCodes.PROVIDER_RESPONSE_INVALID });

    const mismatchService = makeService({
      name: 'test',
      translate: jest.fn().mockResolvedValue(
        providerOutput({ translatedText: '3 porcioni a 12,50 $', detectedSourceLanguage: 'it' }),
      ),
    });
    const result = await mismatchService.translate({
      text: '2 portions at $12.50',
      sourceLanguage: 'en',
      targetLanguage: 'it',
      direction: 'waiter-to-customer',
    });
    expect(result.uncertain).toBe(true);
    expect(result.requiresHumanVerification).toBe(true);
    expect(result.uncertaintyReasons.join(' ')).toMatch(/numbers/i);
  });

  it('does not let a provider failure in glossary loading block translation', async () => {
    const service = new InterpreterService({
      provider: {
        name: 'test',
        translate: jest.fn().mockResolvedValue(providerOutput()),
      },
      maxInputChars: 2000,
      maxGlossaryItems: 3,
      loadGlossary: async () => {
        throw new Error('database offline');
      },
    });
    await expect(
      service.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        direction: 'waiter-to-customer',
      }),
    ).resolves.toMatchObject({ translatedText: 'Buongiorno, benvenuti.' });
  });
});

describe('OpenAICompatibleTranslationProvider', () => {
  const llmResponse = (content: string | null, toolCalls: unknown[] = []): any => ({
    content,
    toolCalls,
  });

  const makeLlm = (turn: any) => {
    const chat = jest.fn().mockResolvedValue(turn);
    return { chat, chatModel: 'model', embeddingModel: null } as unknown as LLMProvider & {
      chat: jest.Mock;
    };
  };

  const request = {
    text: 'Sono allergico alle noci.',
    sourceLanguage: findInterpreterLanguage('it')!,
    targetLanguage: findInterpreterLanguage('en')!,
    direction: 'customer-to-waiter' as const,
    glossary: { restaurantName: 'Trattoria', entries: [] },
  };

  it('sends no tools, uses explicit languages and parses structured output', async () => {
    const llm = makeLlm(
      llmResponse(
        JSON.stringify({
          translatedText: 'I am allergic to nuts.',
          detectedSourceLanguage: 'it',
          uncertain: false,
          uncertaintyReasons: [],
          safetySensitive: true,
        }),
      ),
    );
    const provider = new OpenAICompatibleTranslationProvider({ llm });

    await expect(provider.translate(request)).resolves.toEqual({
      translatedText: 'I am allergic to nuts.',
      detectedSourceLanguage: 'it',
      uncertain: false,
      uncertaintyReasons: [],
      safetySensitive: true,
    });

    const payload = llm.chat.mock.calls[0][0] as ChatRequest;
    expect(payload.tools).toBeUndefined();
    expect(payload.temperature).toBe(0);
    expect(payload.maxTokens).toBeGreaterThanOrEqual(256);
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[0].content).toMatch(/translation engine/i);
    expect(payload.messages[0].content).toMatch(/untrusted/i);
    expect(payload.messages[1].content).toContain('Sono allergico alle noci.');
    expect(payload.messages[1].content).toContain('"sourceLanguage":{"code":"it"');
    expect(payload.messages[1].content).toContain('"targetLanguage":{"code":"en"');
  });

  it('accepts fenced JSON but rejects malformed or empty output', async () => {
    const fenced = new OpenAICompatibleTranslationProvider({
      llm: makeLlm(
        llmResponse(
          '```json\n{"translatedText":"Hello","detectedSourceLanguage":null}\n```',
        ),
      ),
    });
    await expect(fenced.translate(request)).resolves.toMatchObject({ translatedText: 'Hello' });

    for (const content of ['not json', '', '{"uncertain":true}', null]) {
      const provider = new OpenAICompatibleTranslationProvider({
        llm: makeLlm(llmResponse(content)),
      });
      await expect(provider.translate(request)).rejects.toMatchObject({
        code: AiErrorCodes.PROVIDER_RESPONSE_INVALID,
      });
    }
  });

  it('rejects tool calls and invalid language detection instead of executing anything', async () => {
    const toolCallProvider = new OpenAICompatibleTranslationProvider({
      llm: makeLlm(
        llmResponse('{"translatedText":"Hello"}', [
          { id: 'call-1', function: { name: 'prepare_order_draft', arguments: '{}' } },
        ]),
      ),
    });
    await expect(toolCallProvider.translate(request)).rejects.toMatchObject({
      code: AiErrorCodes.PROVIDER_RESPONSE_INVALID,
    });

    const invalidDetection = new OpenAICompatibleTranslationProvider({
      llm: makeLlm(
        llmResponse('{"translatedText":"Hello","detectedSourceLanguage":"Italian"}'),
      ),
    });
    await expect(invalidDetection.translate(request)).resolves.toMatchObject({
      translatedText: 'Hello',
      detectedSourceLanguage: null,
    });
  });
});

describe('restaurant glossary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes only stored terminology fields and a bounded number of entries', async () => {
    asMock(getOrCreateRestaurantSettings).mockResolvedValue({ name: 'Trattoria' });
    asMock(getDB).mockResolvedValue({
      menuItems: {
        find: jest.fn(() => ({
          exec: async () =>
            [
              {
                _id: 'm1',
                name: 'Tomato Pasta',
                description: 'House pasta with tomato',
                price: 12.5,
                category: 'main',
                available: true,
                secret: 'do-not-copy',
              },
              { _id: 'm2', name: 'Chocolate Cake', price: 6, category: 'dessert' },
              { _id: 'm3', name: 'Ignored by limit', price: 3, category: 'side' },
            ].map((row) => ({ toJSON: () => row })),
        })),
      },
    });

    const glossary = await loadRestaurantGlossary(2);
    expect(glossary.restaurantName).toBe('Trattoria');
    expect(glossary.entries).toHaveLength(2);
    expect(glossary.entries[0]).toEqual({
      term: 'Tomato Pasta',
      category: 'main',
      description: 'House pasta with tomato',
    });
    expect(JSON.stringify(glossary)).not.toContain('do-not-copy');
    expect(JSON.stringify(glossary)).not.toContain('12.5');
    expect(glossary.entries[0]).not.toHaveProperty('available');
  });

  it('degrades to an empty glossary when restaurant data cannot be read', async () => {
    asMock(getOrCreateRestaurantSettings).mockRejectedValue(new Error('offline'));
    asMock(getDB).mockRejectedValue(new Error('offline'));
    await expect(loadRestaurantGlossary(5)).resolves.toEqual({
      restaurantName: '',
      entries: [],
      unavailable: true,
    });
  });
});

describe('interpreter authorization', () => {
  const response = () => {
    const res: any = {
      statusCode: 200,
      body: undefined,
      status: jest.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(function (this: any, body: unknown) {
        this.body = body;
        return this;
      }),
    };
    return res;
  };

  it('allows staff/admin and rejects customers or anonymous callers', () => {
    for (const role of ['staff', 'admin']) {
      const next = jest.fn();
      requireAiWaiter({ user: { _id: 'u1', role } } as any, response(), next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    const anonymous = response();
    requireAiWaiter({} as any, anonymous, jest.fn());
    expect(anonymous.statusCode).toBe(401);

    const customer = response();
    requireAiWaiter({ user: { _id: 'u2', role: 'customer' } } as any, customer, jest.fn());
    expect(customer.statusCode).toBe(403);
    expect(customer.body.error.code).toBe(AiErrorCodes.FORBIDDEN);
  });
});
