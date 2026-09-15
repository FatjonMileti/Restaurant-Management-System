import { ClientError } from 'graphql-request';
import { getGraphQLErrorMessage } from '../graphqlErrors';

let mockSessionUser: any = null;
jest.mock('../../store/authStore', () => ({
  useAuthStore: { getState: () => ({ user: mockSessionUser }) },
}));

const clientError = (errors?: Array<{ message?: string; extensions?: any }>) =>
  new ClientError(
    { errors, data: undefined, extensions: undefined, headers: undefined, status: 200 } as any,
    { query: '', variables: {} } as any,
  );

describe('getGraphQLErrorMessage', () => {
  beforeEach(() => {
    mockSessionUser = null;
  });
  it('extracts the first GraphQL error message', () => {
    expect(
      getGraphQLErrorMessage(clientError([{ message: 'Table is busy' }])),
    ).toBe('Table is busy');
  });

  it('prefers the server message with a custom fallback', () => {
    expect(getGraphQLErrorMessage(clientError([{ message: 'Login failed' }]), 'Fallback')).toBe(
      'Login failed',
    );
  });

  it('uses the ClientError message when the response carries no errors', () => {
    const msg = getGraphQLErrorMessage(clientError(undefined), 'Fallback');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('maps network TypeErrors to the backend-unavailable message', () => {
    expect(getGraphQLErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Network error: backend is unavailable',
    );
    expect(getGraphQLErrorMessage(new TypeError('NetworkError when attempting to fetch'))).toBe(
      'Network error: backend is unavailable',
    );
  });

  it('passes through other Error messages', () => {
    expect(getGraphQLErrorMessage(new Error('boom'))).toBe('boom');
    expect(getGraphQLErrorMessage(new Error(''), 'Fallback')).toBe('Fallback');
  });

  it('returns the fallback for unknown values', () => {
    expect(getGraphQLErrorMessage('nope')).toBe('Request failed');
    expect(getGraphQLErrorMessage(undefined, 'Custom')).toBe('Custom');
  });

  it('maps FORBIDDEN to a permission message', () => {
    mockSessionUser = { token: 't' };
    expect(
      getGraphQLErrorMessage(
        clientError([{ message: 'Not authorized, admin only', extensions: { code: 'FORBIDDEN' } }]),
      ),
    ).toBe("You don't have permission to perform this action.");
  });

  it('also reads a top-level code for robustness', () => {
    expect(
      getGraphQLErrorMessage(clientError([{ message: 'x', code: 'FORBIDDEN' } as any])),
    ).toBe("You don't have permission to perform this action.");
  });

  it('maps UNAUTHENTICATED to session-expired only with a stored session', () => {
    mockSessionUser = { token: 't' };
    expect(
      getGraphQLErrorMessage(
        clientError([
          { message: 'Not authenticated', extensions: { code: 'UNAUTHENTICATED' } },
        ]),
      ),
    ).toBe('Your session has expired. Please log in again.');
    // Login form itself: no session yet, server message passes through.
    mockSessionUser = null;
    expect(
      getGraphQLErrorMessage(
        clientError([
          { message: 'Invalid email or password', extensions: { code: 'UNAUTHENTICATED' } },
        ]),
        'Login failed',
      ),
    ).toBe('Invalid email or password');
  });
});
