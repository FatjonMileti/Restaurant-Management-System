import { z } from 'zod';
import { WaitressAgent } from '../ai/agent.js';
import { ToolRegistry } from '../ai/toolRegistry.js';
import type { AssistantTurn, ChatRequest, LLMProvider, ToolCall } from '../ai/types.js';

const toolCall = (name: string, args: string, id = 'call-1'): ToolCall => ({
  id,
  type: 'function',
  function: { name, arguments: args },
});

const createProvider = (turns: AssistantTurn[]) => {
  const chat = jest.fn(async (_request: ChatRequest) => {
    const turn = turns.shift();
    if (!turn) throw new Error('No more provider turns configured');
    return turn;
  });
  const provider: LLMProvider = {
    chatModel: 'test-chat',
    embeddingModel: null,
    chat,
    embed: jest.fn().mockResolvedValue([]),
  };
  return { provider, chat };
};

const createRegistry = () =>
  new ToolRegistry({ timeoutMs: 200 }).register({
    name: 'search_menu',
    description: 'Search menu',
    access: 'public',
    schema: z.object({ query: z.string() }).strict(),
    parameters: {},
    handler: async (args: { query: string }) => ({
      ok: true,
      data: {
        items: [
          { menuItemId: 'm1', name: `Pasta ${args.query}`, price: 12.5, category: 'main' },
          { menuItemId: '', name: 'Invalid without id', price: 1 },
          { menuItemId: 'm3', name: 'No price' },
        ],
      },
    }),
  });

const options = { maxIterations: 4, maxToolCallsPerTurn: 2, maxToolResultChars: 2000 };
const input = {
  systemPrompt: 'system rules',
  history: [{ role: 'user' as const, content: 'earlier question' }],
  userMessage: 'what pasta do you have?',
  context: {},
};

describe('WaitressAgent', () => {
  it('runs tools, feeds results back, and collects only safe artifacts', async () => {
    const { provider, chat } = createProvider([
      { content: null, toolCalls: [toolCall('search_menu', '{"query":"tomato"}')] },
      { content: 'We have tomato pasta.', toolCalls: [] },
    ]);
    const agent = new WaitressAgent(provider, createRegistry(), options);

    const result = await agent.run(input);

    expect(result.content).toBe('We have tomato pasta.');
    expect(result.truncated).toBe(false);
    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toEqual([
      expect.objectContaining({ name: 'search_menu', ok: true }),
    ]);
    expect(result.artifacts.menuItems).toEqual([
      {
        menuItemId: 'm1',
        name: 'Pasta tomato',
        description: '',
        price: 12.5,
        category: 'main',
        image: '',
        available: true,
      },
    ]);

    const firstMessages = chat.mock.calls[0][0].messages;
    expect(firstMessages[0]).toEqual({ role: 'system', content: 'system rules' });
    expect(firstMessages[1]).toEqual({ role: 'user', content: 'earlier question' });
    const secondMessages = chat.mock.calls[1][0].messages;
    const toolMessage = secondMessages.find((message) => message.role === 'tool');
    expect(toolMessage).toMatchObject({ tool_call_id: 'call-1', name: 'search_menu' });
    expect(toolMessage?.content).toContain('Pasta tomato');
    expect(toolMessage?.content).toContain('12.5');
  });

  it('stops at the iteration limit and reports truncation', async () => {
    const turns = Array.from({ length: 3 }, (_, index) => ({
      content: null,
      toolCalls: [toolCall('search_menu', '{"query":"x"}', `call-${index}`)],
    }));
    const { provider, chat } = createProvider(turns);
    const agent = new WaitressAgent(provider, createRegistry(), {
      ...options,
      maxIterations: 2,
    });

    const result = await agent.run(input);
    expect(chat).toHaveBeenCalledTimes(2);
    expect(result.iterations).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.content).toMatch(/could not finish/i);
  });

  it('rejects excess tool calls in one turn without executing them', async () => {
    const { provider } = createProvider([
      {
        content: null,
        toolCalls: [
          toolCall('search_menu', '{"query":"a"}', 'call-1'),
          toolCall('search_menu', '{"query":"b"}', 'call-2'),
        ],
      },
      { content: 'Done with one.', toolCalls: [] },
    ]);
    const agent = new WaitressAgent(provider, createRegistry(), {
      ...options,
      maxToolCallsPerTurn: 1,
    });

    const result = await agent.run(input);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].ok).toBe(true);
    expect(result.toolCalls[1]).toMatchObject({ ok: false, errorCode: 'TOO_MANY_TOOL_CALLS' });
    expect(result.artifacts.menuItems).toHaveLength(1);
  });

  it('returns a safe trace for malformed arguments and unknown tools', async () => {
    const { provider, chat } = createProvider([
      {
        content: null,
        toolCalls: [
          toolCall('search_menu', '{not-json', 'call-1'),
          toolCall('delete_everything', '{}', 'call-2'),
        ],
      },
      { content: 'I could not check that.', toolCalls: [] },
    ]);
    const agent = new WaitressAgent(provider, createRegistry(), options);

    const result = await agent.run(input);
    expect(result.content).toBe('I could not check that.');
    expect(result.toolCalls).toEqual([
      expect.objectContaining({ name: 'search_menu', ok: false, errorCode: 'INVALID_ARGUMENTS' }),
      expect.objectContaining({ name: 'delete_everything', ok: false, errorCode: 'UNKNOWN_TOOL' }),
    ]);
    expect(result.artifacts.menuItems).toEqual([]);

    const toolMessages = chat.mock.calls[1][0].messages.filter((message) => message.role === 'tool');
    expect(toolMessages[0].content).toContain('INVALID_ARGUMENTS');
    expect(toolMessages[1].content).toContain('UNKNOWN_TOOL');
  });

  it('truncates oversized tool output before sending it to the model', async () => {
    const registry = new ToolRegistry({ timeoutMs: 200 }).register({
      name: 'search_menu',
      description: 'Search menu',
      access: 'public',
      schema: z.object({}).strict(),
      parameters: {},
      handler: async () => ({
        ok: true,
        data: { items: [{ menuItemId: 'm1', name: 'x'.repeat(500), price: 1, category: 'main' }] },
      }),
    });
    const { provider, chat } = createProvider([
      { content: null, toolCalls: [toolCall('search_menu', '{}')] },
      { content: 'Done.', toolCalls: [] },
    ]);
    const agent = new WaitressAgent(provider, registry, { ...options, maxToolResultChars: 300 });

    await agent.run(input);
    const toolMessage = chat.mock.calls[1][0].messages.find((message) => message.role === 'tool');
    expect(toolMessage?.content).toContain('truncated');
    expect((toolMessage?.content ?? '').length).toBeLessThan(500);
  });
});
