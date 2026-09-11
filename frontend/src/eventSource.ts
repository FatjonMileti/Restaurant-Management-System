const WS_BASE = process.env.REACT_APP_WS_URL;

// Empty string means same-origin (e.g. REACT_APP_WS_URL= behind Caddy -> "/events").
const EVENT_SOURCE_URL =
  WS_BASE === undefined ? 'http://localhost:5000/events' : `${WS_BASE}/events`;

let eventSource: EventSource | null = null;

export const getEventSource = (): EventSource => {
  if (!eventSource) {
    eventSource = new EventSource(EVENT_SOURCE_URL);
  }
  return eventSource;
};

export const closeEventSource = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
};
