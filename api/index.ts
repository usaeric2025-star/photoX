import { handle } from "hono/vercel";
import { app } from "../dist/server/server-build.js";

export default handle(app as any);
