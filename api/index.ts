import { handle } from "hono/vercel";
import { app } from "./app";

export const fetch = handle(app);
export default fetch;

