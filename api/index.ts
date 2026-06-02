import { handle } from "hono/vercel";
import { app } from "./app.js";

export const fetch = handle(app);

