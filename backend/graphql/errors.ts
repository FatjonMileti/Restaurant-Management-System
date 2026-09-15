/**
 * Coded application errors for GraphQL resolvers.
 *
 * Throw these instead of plain `Error` so clients receive a machine-readable
 * `code` alongside the (already user-facing) message. Messages are kept
 * identical to the historic plain-Error texts.
 */
export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export const authError = (message = 'Not authenticated'): AppError =>
  new AppError(ErrorCodes.UNAUTHENTICATED, message);

export const forbiddenError = (message: string): AppError =>
  new AppError(ErrorCodes.FORBIDDEN, message);

export const validationError = (message: string): AppError =>
  new AppError(ErrorCodes.VALIDATION_FAILED, message);

export const notFoundError = (message: string): AppError =>
  new AppError(ErrorCodes.NOT_FOUND, message);

export const conflictError = (message: string): AppError =>
  new AppError(ErrorCodes.CONFLICT, message);

/**
 * express-graphql error formatter (use as `customFormatErrorFn`).
 * Surfaces `{ message, code }` — unknown failures default to INTERNAL so
 * clients can distinguish expected domain errors from generic ones.
 */
export const formatGraphQLError = (err: any) => {
  const original = (err as any)?.originalError as { code?: unknown } | undefined;
  const code =
    typeof original?.code === 'string' ? (original.code as string) : ErrorCodes.INTERNAL;
  return {
    message: (err as any)?.message || 'Unknown error',
    code,
    path: (err as any)?.path,
    locations: (err as any)?.locations,
  };
};
