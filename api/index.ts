import { handle } from 'hono/vercel';
import { app } from './_app.js';

// Vercel Serverless Functions work best with direct named exports of the Hono handler
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);


