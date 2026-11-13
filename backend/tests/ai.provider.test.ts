import { AiError, AiErrorCodes } from '../ai/errors.js';
import { OpenAICompatibleProvider } from '../ai/provider.js';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const response = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const createProvider = (fetchImpl: FetchLike, overrides: Record<string, unknown> = {}) =>
  new OpenAICompatibleProvider({
    baseUrl: 'https://llm.example/v1/',
    apiKey: 'secret',
    model: 'chat-model',
    embeddingModel: 'embed-model',
    timeoutMs: 1000,
    fetchImpl,
    ...overrides,
  });

describe('OpenAI-compatible provider', () => {
  it('sends a bounded chat request and normalizes tool calls', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      response({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  function: { name: 'search_menu', arguments: '{"query":"pasta"}' },
                },
                { id: 'call-2', function: { name: 'get_restaurant_information', arguments: {} } },
                { function: { name: '' } },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    );
    const provider = createProvider(fetchMock as unknown as FetchLike);

    const turn = await provider.chat({
      messages: [{ role: 'user', content: 'pasta?' }],
      tools: [
        {
          type: 'function',
          function: { name: 'search_menu', description: 'x', parameters: {} },
        },
      ],
    });

    expect(turn.content).toBeNull();
    expect(turn.toolCalls).toHaveLength(2);
    expect(turn.toolCalls[1].function.arguments).toBe('{}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://llm.example/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer secret');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('chat-model');
    expect(body.tool_choice).toBe('auto');
  });

  it('returns trimmed text when no tools are called', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(response({ choices: [{ message: { content: '  Hello  ' } }] }));
    const provider = createProvider(fetchMock as unknown as FetchLike);
    await expect(provider.chat({ messages: [] })).resolves.toEqual({
      content: 'Hello',
      toolCalls: [],
      finishReason: undefined,
    });
  });

  it('maps provider failures to safe typed errors without leaking response bodies', async () => {
    const cases = [
      { status: 500, code: AiErrorCodes.PROVIDER_UNAVAILABLE },
      { status: 429, code: AiErrorCodes.PROVIDER_UNAVAILABLE },
      { status: 401, code: AiErrorCodes.PROVIDER_UNAVAILABLE },
      { status: 408, code: AiErrorCodes.PROVIDER_TIMEOUT },
      { status: 400, code: AiErrorCodes.PROVIDER_RESPONSE_INVALID },
    ];
    for (const testCase of cases) {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(response({ error: 'super-secret upstream detail' }, testCase.status));
      const provider = createProvider(fetchMock as unknown as FetchLike);
      const error = await provider.chat({ messages: [] }).catch((caught) => caught);
      expect(error).toBeInstanceOf(AiError);
      expect(error.code).toBe(testCase.code);
      expect(error.message).not.toContain('super-secret');
    }
  });

  it('rejects unreadable provider payloads', async () => {
    const provider = createProvider(jest
      .fn()
      .mockResolvedValue(response({ choices: [] })) as unknown as FetchLike);
    await expect(provider.chat({ messages: [] })).rejects.toMatchObject({
      code: AiErrorCodes.PROVIDER_RESPONSE_INVALID,
    });
  });

  it('embeds texts in provider order and validates the vector count', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      response({
        data: [
          { index: 1, embedding: [0, 1] },
          { index: 0, embedding: [1, 0] },
        ],
      }),
    );
    const provider = createProvider(fetchMock as unknown as FetchLike);
    await expect(provider.embed(['a', 'b'])).resolves.toEqual([
      [1, 0],
      [0, 1],
    ]);

    const wrongCount = createProvider(
      jest.fn().mockResolvedValue(response({ data: [{ index: 0, embedding: [1] }] })) as unknown as FetchLike,
    );
    await expect(wrongCount.embed(['a', 'b'])).rejects.toMatchObject({
      code: AiErrorCodes.PROVIDER_RESPONSE_INVALID,
    });
  });

  it('times out when the provider does not answer', async () => {
    const hangingFetch: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const provider = createProvider(hangingFetch, { timeoutMs: 20 });
    const error = await provider.chat({ messages: [] }).catch((caught) => caught);
    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe(AiErrorCodes.PROVIDER_TIMEOUT);
    expect(error.status).toBe(504);
  });
});
