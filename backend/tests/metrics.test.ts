import { graphqlErrorsTotal, httpRequestsTotal, normalizeRoutePath, register } from '../metrics';

describe('metrics', () => {
  it('normalizes numeric, UUID and image paths', () => {
    expect(normalizeRoutePath('/orders/123')).toBe('/orders/:id');
    expect(normalizeRoutePath('/orders/123/items')).toBe('/orders/:id/items');
    expect(normalizeRoutePath('/events/550e8400-e29b-41d4-a716-446655440000')).toBe('/events/:id');
    expect(normalizeRoutePath('/events/staff1')).toBe('/events/:id');
    expect(normalizeRoutePath('/images/pizza.jpg')).toBe('/images/*');
    expect(normalizeRoutePath('/static/js/main.1a2b3c4d.js')).toBe('/static/*');
    expect(normalizeRoutePath('/orders?limit=10')).toBe('/orders');
    expect(normalizeRoutePath('')).toBe('/');
  });

  it('exposes app metrics through the registry', async () => {
    httpRequestsTotal.inc({ method: 'GET', route: '/health', status_code: '200' });
    graphqlErrorsTotal.inc({ code: 'VALIDATION_FAILED' });

    const output = await register.metrics();
    expect(output).toContain('restaurant_http_requests_total');
    expect(output).toContain('restaurant_http_request_duration_seconds');
    expect(output).toContain('restaurant_graphql_errors_total');
    expect(output).toContain('restaurant_sse_connections');
  });
});
