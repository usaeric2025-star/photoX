import { handle } from "hono/vercel";
import { app } from "../dist/server.js";

export default handle(app as any);
