import { ClientError } from 'graphql-request';

const NETWORK_HINTS = ['Failed to fetch', 'NetworkError', 'Network request failed', 'Load failed'];

/**
 * Single shared extractor for GraphQL/mutation failure messages.
 *
 * - `ClientError` → first GraphQL error message (the backend already sends
 *   user-facing texts plus a machine-readable `code` in `extensions`).
 * - Network-level `TypeError` → backend-unavailable message.
 * - Anything else carrying a message → that message, else the fallback.
 */
export const getGraphQLErrorMessage = (err: unknown, fallback = 'Request failed'): string => {
  if (err instanceof ClientError) {
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
