const WS_BASE = process.env.REACT_APP_WS_URL;

// Empty string means same-origin (e.g. REACT_APP_WS_URL= behind Caddy -> "/events").
// In dev mode with CRA proxy, use same-origin to go through the proxy to backend.
const EVENT_SOURCE_URL =
  WS_BASE === undefined ? '/events' : `${WS_BASE}/events`;

let eventSource: EventSource | null = null;

export const getEventSource = (id?: string): EventSource | null => {
  if (!eventSource && id) {
    const url = `${EVENT_SOURCE_URL}/${id}`;
    eventSource = new EventSource(url);
    eventSource.onopen = () => {
      if (eventSource) {
      }
    };
    eventSource.onerror = (e) => {
      if (eventSource) {
        console.error('[SSE] Error event:', e);
        console.error('[SSE] ReadyState:', eventSource.readyState);
        console.error('[SSE] URL:', url);
      }
    };
  }
  return eventSource || null;
};

export const closeEventSource = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
};
