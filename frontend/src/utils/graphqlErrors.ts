import { ClientError } from 'graphql-request';
import { useAuthStore } from '../store/authStore';

const NETWORK_HINTS = ['Failed to fetch', 'NetworkError', 'Network request failed', 'Load failed'];

const readCode = (err: unknown): string | undefined => {
  if (err instanceof ClientError) {
    const first = err.response.errors?.[0] as
      | { extensions?: { code?: unknown }; code?: unknown }
      | undefined;
    const code = first?.extensions?.code ?? first?.code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
};

/**
 * Single shared extractor for GraphQL/mutation failure messages.
 *
 * - `ClientError` → first GraphQL error message (the backend already sends
 *   user-facing texts plus a machine-readable `code` in `extensions`), with
 *   specific handling for permission/session codes below.
 * - Network-level `TypeError` → backend-unavailable message.
 * - Anything else carrying a message → that message, else the fallback.
 */
export const getGraphQLErrorMessage = (err: unknown, fallback = 'Request failed'): string => {
  if (err instanceof ClientError) {
    const code = readCode(err);
    if (code === 'FORBIDDEN') {
      return "You don't have permission to perform this action.";
    }
    if (code === 'UNAUTHENTICATED' && useAuthStore.getState().user?.token) {
      // Logged-in session rejected (e.g. expired token) — but not the login
      // form itself, where the same code means bad credentials and the
      // server message must pass through untouched.
      return 'Your session has expired. Please log in again.';
    }
    const first = err.response.errors?.[0] as { message?: string } | undefined;
    return first?.message || err.message || fallback;
  }
  if (err instanceof TypeError && NETWORK_HINTS.some((hint) => err.message.includes(hint))) {
    return 'Network error: backend is unavailable';
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
};
