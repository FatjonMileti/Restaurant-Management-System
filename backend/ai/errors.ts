/**
 * Typed errors for the AI subsystem.
 *
 * Routes map these to stable HTTP codes/messages. Provider bodies, prompts,
 * stack traces, and secrets are never included in client-facing messages.
 */
export const AiErrorCodes = {
  AI_DISABLED: 'AI_DISABLED',
  AI_CONFIG_INVALID: 'AI_CONFIG_INVALID',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_RESPONSE_INVALID: 'PROVIDER_RESPONSE_INVALID',
  RAG_UNAVAILABLE: 'RAG_UNAVAILABLE',
  TOOL_TIMEOUT: 'TOOL_TIMEOUT',
  AGENT_ITERATION_LIMIT: 'AGENT_ITERATION_LIMIT',
  DRAFT_EXPIRED: 'DRAFT_EXPIRED',
  DRAFT_NOT_PENDING: 'DRAFT_NOT_PENDING',
  INTERNAL: 'INTERNAL',
} as const;

export type AiErrorCode = (typeof AiErrorCodes)[keyof typeof AiErrorCodes];

export class AiError extends Error {
  code: AiErrorCode;
  status: number;
  details?: unknown;

  constructor(code: AiErrorCode, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const aiDisabledError = () =>
  new AiError(AiErrorCodes.AI_DISABLED, 'The AI assistant is not enabled.', 503);

export const aiConfigError = (message: string) =>
  new AiError(AiErrorCodes.AI_CONFIG_INVALID, message, 503);

export const aiAuthError = (message = 'Please log in to use this feature.') =>
  new AiError(AiErrorCodes.UNAUTHENTICATED, message, 401);

export const aiForbiddenError = (message = 'You do not have permission to do that.') =>
  new AiError(AiErrorCodes.FORBIDDEN, message, 403);

export const aiValidationError = (message: string, details?: unknown) =>
  new AiError(AiErrorCodes.VALIDATION_FAILED, message, 400, details);

export const aiNotFoundError = (message: string) =>
  new AiError(AiErrorCodes.NOT_FOUND, message, 404);

export const aiConflictError = (message: string) =>
  new AiError(AiErrorCodes.CONFLICT, message, 409);

export const providerUnavailableError = (message = 'The AI service is unavailable right now.') =>
  new AiError(AiErrorCodes.PROVIDER_UNAVAILABLE, message, 503);

export const providerTimeoutError = () =>
  new AiError(AiErrorCodes.PROVIDER_TIMEOUT, 'The AI service took too long to respond.', 504);

export const providerResponseError = () =>
  new AiError(
    AiErrorCodes.PROVIDER_RESPONSE_INVALID,
    'The AI service returned an unreadable response.',
    502,
  );

export const ragUnavailableError = (message = 'The restaurant knowledge base is unavailable.') =>
  new AiError(AiErrorCodes.RAG_UNAVAILABLE, message, 503);

export const toolTimeoutError = (name: string) =>
  new AiError(AiErrorCodes.TOOL_TIMEOUT, `The "${name}" check took too long.`, 504);

/** Convert an unknown thrown value into a safe HTTP payload. */
export const toSafeErrorPayload = (error: unknown): { code: AiErrorCode; message: string } => {
  if (error instanceof AiError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: AiErrorCodes.INTERNAL,
    message: 'Something went wrong while handling the assistant request.',
  };
};
