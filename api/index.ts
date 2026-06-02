import { handle } from "hono/vercel";
import { app } from "../src/api/app";

export default handle(app);
