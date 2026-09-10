import { Request, Response } from 'express';

const clients: Set<Response> = new Set();

export const initSSE = (app: any) => {
  app.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const ping = () => {
      if (!res.writableEnded) res.write('event: ping\ndata: {}\n\n');
    };

    clients.add(res);
    // send initial connection event
    res.write('event: connected\ndata: {}\n\n');

    const pingInterval = setInterval(ping, 15000);
    req.on('close', () => {
      clearInterval(pingInterval);
      clients.delete(res);
    });
  });
};

export const emitEvent = (event: string, data?: any) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  clients.forEach((res) => {
    if (!res.writableEnded) {
      res.write(payload);
    }
  });
};
