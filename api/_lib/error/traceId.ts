import { Context } from "hono";

export function getTraceId(c: Context): string {
  // Try to get from header, or generate a new one
  let traceId = c.req.header('x-trace-id');
  if (!traceId) {
    traceId = crypto.randomUUID();
  }
  return traceId;
}
