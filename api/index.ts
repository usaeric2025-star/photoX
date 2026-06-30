import { handle } from '@hono/node-server/vercel';
import { app } from './_app.js';

export default handle(app);

