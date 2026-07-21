import { logger } from './logger.js';
import { errorResponse } from './response.js';
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "../../shared/envSchema.js";
import { Context, Next } from 'hono';

const serverEnv = getServerEnv(process.env);
let authSessionClientInstance: SupabaseClient | null = null;

export async function requireRealUser(c: Context) {
  if (c.get('user')) return c.get('user');

  const authHeader = c.req.header('Authorization');
  if (!authHeader) throw new Error("Unauthorized: No credentials provided");
  
  if (!authSessionClientInstance) {
    const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL || '';
    const supabaseKey = serverEnv.VITE_SUPABASE_ANON_KEY || (serverEnv as Record<string, unknown>).SUPABASE_ANON_KEY as string || serverEnv.SUPABASE_SERVICE_KEY || ''; // Use any available key for session check
    if (!supabaseUrl) {
      logger.error("[Auth] SUPABASE_URL is missing from environment");
      throw new Error("Server Configuration Error: Missing Supabase URL");
    }
    authSessionClientInstance = createClient(supabaseUrl, supabaseKey);
  }
  
  const { data: { user }, error } = await authSessionClientInstance.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) throw new Error("Unauthorized: Invalid/Expired Session");
  
  c.set('user', user);
  return user;
}

async function adminAuthMiddleware(c: Context, next: Next) {
    // Whitelist public-accessible admin routes
    if (c.req.path.endsWith('/admin/settings/get-keys')) {
        await next();
        return;
    }

    try {
        await requireRealUser(c);
        await next();
    } catch (e: unknown) {
        const error = e as Error;
        logger.error(`[Auth Error] ${c.req.path}: ${error.message}`);
        return errorResponse(c, error, 401);
    }
}
