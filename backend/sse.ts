import { Request, Response } from 'express';

const clients: Set<{ userId: string; res: Response }> = new Set();

export const initSSE = (app: any) => {
  app.get('/events/:userId', (req: Request, res: Response) => {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const ping = () => {
      if (!res.writableEnded) res.write('event: ping\ndata: {}\n\n');
    };

    // add client as {userId, res}
    const userId = req.params.userId as string;
    clients.add({ userId, res });
    // send initial connection event
    res.write('event: connected\ndata: {}\n\n');

    const pingInterval = setInterval(ping, 15000);
    req.on('close', () => {
      clearInterval(pingInterval);
      clients.delete({ userId, res });
    });
  });
};

// emit event to all other clients except the one with the given userId
export const emitEvent = (event: string, data?: any, excludeUserId?: string) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  clients.forEach(({ userId, res }) => {
    if (userId !== excludeUserId && !res.writableEnded) {
      res.write(payload);
    }
  });
};
