import {
  AppError,
  ErrorCodes,
  authError,
  conflictError,
  forbiddenError,
  formatGraphQLError,
  notFoundError,
  validationError,
} from '../graphql/errors';

describe('coded errors', () => {
  it('factories carry the right code and preserve the message', () => {
    expect(authError()).toMatchObject({ code: 'UNAUTHENTICATED', message: 'Not authenticated' });
    expect(authError('Invalid email or password')).toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Invalid email or password',
    });
    expect(forbiddenError('Not authorized, admin only')).toMatchObject({
      code: 'FORBIDDEN',
      message: 'Not authorized, admin only',
    });
    expect(validationError('Name is required')).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Name is required',
    });
    expect(notFoundError('Order not found')).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Order not found',
    });
    expect(conflictError('Table is busy')).toMatchObject({
      code: 'CONFLICT',
      message: 'Table is busy',
    });
  });

  it('factories produce Error instances', () => {
    for (const err of [authError(), forbiddenError('x'), validationError('x')]) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    }
  });
});

describe('formatGraphQLError', () => {
  it('surfaces the original error code under extensions', () => {
    const err = {
      message: 'Table is busy',
      path: ['createOrder'],
      locations: [{ line: 1, column: 1 }],
      originalError: conflictError('Table is busy'),
    };
    expect(formatGraphQLError(err)).toEqual({
      message: 'Table is busy',
      path: ['createOrder'],
      locations: [{ line: 1, column: 1 }],
      extensions: { code: 'CONFLICT' },
    });
  });

  it('defaults to INTERNAL for plain errors', () => {
    expect(formatGraphQLError({ message: 'boom', originalError: new Error('boom') })).toEqual({
      message: 'boom',
      path: undefined,
      locations: undefined,
      extensions: { code: ErrorCodes.INTERNAL },
    });
  });

  it('falls back to Unknown error without a message', () => {
    expect(formatGraphQLError({})).toMatchObject({
      message: 'Unknown error',
      extensions: { code: ErrorCodes.INTERNAL },
    });
  });
});
