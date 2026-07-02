import { app } from './_app.js';

export const GET = (req: Request) => app.request(req);
export const POST = (req: Request) => app.request(req);
export const PUT = (req: Request) => app.request(req);
export const DELETE = (req: Request) => app.request(req);
export const OPTIONS = (req: Request) => app.request(req);
export const PATCH = (req: Request) => app.request(req);
export const HEAD = (req: Request) => app.request(req);

export default app;

