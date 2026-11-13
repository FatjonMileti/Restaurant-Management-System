import { z } from 'zod';
import { ToolRegistry } from '../ai/toolRegistry.js';
import { AiErrorCodes } from '../ai/errors.js';

const publicTool = {
  name: 'echo',
  description: 'Echo a number',
  access: 'public' as const,
  schema: z.object({ value: z.number().int() }).strict(),
  parameters: {},
  handler: async (args: { value: number }, context: any) => ({
    ok: true,
    data: { value: args.value, userId: context.userId ?? null, hasSignal: Boolean(context.signal) },
  }),
};

const authTool = {
  name: 'account',
  description: 'Account-only tool',
  access: 'authenticated' as const,
  schema: z.object({}).strict(),
  parameters: {},
  handler: async (_args: unknown, context: any) => ({ ok: true, data: context.userId }),
};

const adminTool = {
  name: 'manage',
  description: 'Admin-only tool',
  access: 'admin' as const,
  schema: z.object({}).strict(),
  parameters: {},
  handler: async () => ({ ok: true, data: 'admin' }),
};

const build = (timeoutMs = 500) =>
  new ToolRegistry({ timeoutMs }).register(publicTool).register(authTool).register(adminTool);

describe('AI tool registry', () => {
  it('exposes only tools allowed for the caller', () => {
    const registry = build();
    expect(registry.definitionsFor({}).map((tool) => tool.function.name)).toEqual(['echo']);
    expect(
      registry.definitionsFor({ userId: 'u1', user: { id: 'u1', name: '', email: '', role: 'customer' } })
        .map((tool) => tool.function.name),
    ).toEqual(['echo', 'account']);
    expect(
      registry.definitionsFor({ userId: 'a1', user: { id: 'a1', name: '', email: '', role: 'admin' } })
        .map((tool) => tool.function.name),
    ).toEqual(['echo', 'account', 'manage']);
  });

  it('rejects unknown tools and unauthorized access', async () => {
    const registry = build();
    await expect(registry.dispatch('missing', {}, {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_TOOL' },
    });
    await expect(registry.dispatch('account', {}, {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    await expect(registry.dispatch('manage', {}, { userId: 'u1', user: { role: 'staff' } as any })).resolves.toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
  });

  it('validates JSON and zod arguments before dispatch', async () => {
    const registry = build();
    await expect(registry.dispatch('echo', '{bad json', {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_ARGUMENTS' },
    });
    await expect(registry.dispatch('echo', { value: 'nope' }, {})).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_ARGUMENTS' },
    });
    await expect(registry.dispatch('echo', '{"value":3}', { userId: 'u1' })).resolves.toMatchObject({
      ok: true,
      data: { value: 3, userId: 'u1', hasSignal: true },
    });
  });

  it('bounds execution time and redacts unexpected handler errors', async () => {
    const registry = new ToolRegistry({ timeoutMs: 20 })
      .register({
        ...publicTool,
        name: 'slow',
        handler: () => new Promise(() => undefined),
      })
      .register({
        ...publicTool,
        name: 'explode',
        handler: async () => {
          throw new Error('database password is hunter2');
        },
      });

    await expect(registry.dispatch('slow', { value: 1 }, {})).resolves.toMatchObject({
      ok: false,
      error: { code: AiErrorCodes.TOOL_TIMEOUT },
    });
    const failed = await registry.dispatch('explode', { value: 1 }, {});
    expect(failed).toMatchObject({ ok: false, error: { code: 'TOOL_FAILED' } });
    expect(JSON.stringify(failed)).not.toContain('hunter2');
  });

  it('refuses duplicate tool names', () => {
    const registry = build();
    expect(() => registry.register(publicTool)).toThrow('already registered');
  });
});
