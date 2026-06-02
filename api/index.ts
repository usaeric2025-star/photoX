import { handle } from "hono/vercel";

let app;
try {
  const module = await import("./app");
  app = module.app;
  console.log("[API] Server module loaded successfully");
} catch (err) {
  console.error("[API] Failed to load server module:", err);
  throw err;
}

export default handle(app);
