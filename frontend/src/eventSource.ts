const EVENT_SOURCE_URL = process.env.REACT_APP_WS_URL
  ? `${process.env.REACT_APP_WS_URL}/events`
  : 'http://localhost:5000/events';

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
