/**
 * eventSource URL resolution — same-origin support for Caddy deployments.
 * The module reads REACT_APP_WS_URL at import time, so each case re-imports
 * it with a fresh module registry.
 */
describe('eventSource URL resolution', () => {
  const RealEventSource = global.EventSource;

  class MockEventSource {
    static urls: string[] = [];
    url: string;
    close = jest.fn();
    constructor(url: string) {
      this.url = url;
      MockEventSource.urls.push(url);
    }
  }

  beforeEach(() => {
    jest.resetModules();
    MockEventSource.urls = [];
    (global as any).EventSource = MockEventSource;
  });

  afterAll(() => {
    (global as any).EventSource = RealEventSource;
    delete process.env.REACT_APP_WS_URL;
  });

  const loadUrl = async (wsUrl: string | undefined): Promise<string> => {
    if (wsUrl === undefined) {
      delete process.env.REACT_APP_WS_URL;
    } else {
      process.env.REACT_APP_WS_URL = wsUrl;
    }
    const mod = await import('../eventSource');
    mod.getEventSource();
    const url = MockEventSource.urls[0];
    mod.closeEventSource();
    return url;
  };

  it('defaults to the local backend when REACT_APP_WS_URL is unset', async () => {
    await expect(loadUrl(undefined)).resolves.toBe('http://localhost:5000/events');
  });

  it('uses same-origin /events when REACT_APP_WS_URL is empty (Caddy)', async () => {
    await expect(loadUrl('')).resolves.toBe('/events');
  });

  it('prefixes an absolute base URL', async () => {
    await expect(loadUrl('https://api.example.com')).resolves.toBe(
      'https://api.example.com/events',
    );
  });
});
