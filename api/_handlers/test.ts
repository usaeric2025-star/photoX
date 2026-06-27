import { Hono } from 'hono';

export const testHandler = (app: Hono) => {
  app.get('/test-ping', (c) => {
    return c.json({ success: true, message: 'pong', env: process.env.NODE_ENV });
  });
};
