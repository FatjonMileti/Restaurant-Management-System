import { ClientError } from 'graphql-request';
import { getGraphQLErrorMessage } from '../graphqlErrors';

const clientError = (errors?: Array<{ message?: string }>) =>
  new ClientError(
    { errors, data: undefined, extensions: undefined, headers: undefined, status: 200 } as any,
    { query: '', variables: {} } as any,
  );

describe('getGraphQLErrorMessage', () => {
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
});
