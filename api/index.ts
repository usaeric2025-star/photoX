import { handle } from "hono/vercel";

/**
 * [VERCEL-ENTRY-SAFE]
 * Wraps the Hono app handle with an async try-catch to debug startup failures (e.g., missing modules).
 */
export const fetch = async (req: Request, event: any) => {
  try {
    const { app } = await import("./app.js");
    const handler = handle(app);
    return await handler(req);
  } catch (err: any) {
    console.error("❌ [STARTUP_ERROR] Backend failed to initialize:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "STARTUP_ERROR",
      message: err.message,
      stack: err.stack,
      diagnostic: "Vercel Serverless Function failed to load. Check imports and runtime modules.",
      traceId: "STARTUP-" + Math.random().toString(36).substring(7)
    }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export default fetch;

