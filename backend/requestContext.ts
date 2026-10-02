import { RequestContext } from 'async-context-kit';
import type { RequestHandler } from 'express';

/**
 * Request-scoped correlation context (backed by `async-context-kit`).
 *
 * The Express middleware in this module assigns every request a
 * `requestId` (propagated from the `x-request-id` header when present,
 * otherwise generated) and echoes it back on the response. The id is
 * then visible to all downstream async work — resolvers, retry logging,
 * SSE emission — without threading it through function arguments.
 *
 * Privacy: only `requestId`, `userId` and safe routing metadata
 * (`method`, `path`) are stored. Tokens, passwords, cookies, query
 * strings and bodies are never placed in the context.
 */

export interface AppRequestContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  [key: string]: unknown;
}

export const requestContextMiddleware: RequestHandler = RequestContext.middleware({
  requestId: { header: 'x-request-id', generate: true, responseHeader: true },
  include: { method: true, path: true, ip: false, userAgent: false },
});

/** Current request id, or `undefined` outside a request lifecycle. */
export const getRequestId = (): string | undefined => RequestContext.getValue<string>('requestId');

/** Attach the authenticated user id to the active request context. */
export const setRequestUserId = (userId: string): void => {
  if (RequestContext.has()) RequestContext.setValue('userId', userId);
};

/**
 * Minimal log fields for the current request. Contains only the
 * correlation id and (when authenticated) the user id — never secrets.
 */
export const getLogContext = (): { requestId?: string; userId?: string } => {
  const ctx = RequestContext.get<AppRequestContext>();
  const out: { requestId?: string; userId?: string } = {};
  if (ctx?.requestId) out.requestId = ctx.requestId;
  if (ctx?.userId) out.userId = ctx.userId;
  return out;
};
