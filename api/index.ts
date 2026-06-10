import { handle } from "hono/vercel";
import { app } from "./_app.js";

export const fetch = handle(app);

