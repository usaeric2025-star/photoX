import { HonoRequest } from "hono";
import { logger } from "./logger.js";

export function logTraffic(req: HonoRequest, body: any) {
    if (process.env.DISABLE_TRAFFIC_LOG === 'true') return;
    
    // Only log in development or if explicitly enabled
    // Minimal implementation to prevent crashes
    const { method, url } = req;
    const timestamp = new Date().toISOString();
    
    // Simple console log for now
    if (process.env.NODE_ENV === 'development') {
        logger.debug(`[TRAFFIC] ${timestamp} ${method} ${url}`);
    }
}
