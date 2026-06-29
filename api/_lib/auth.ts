import { logger } from './logger.js';
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "../../shared/envSchema.js";
import { Context, Next } from 'hono';

const serverEnv = getServerEnv(process.env);
let authSessionClientInstance: SupabaseClient | null = null;

export async function requireRealUser(c: Context) {
  if (c.get('user')) return c.get('user');

  const authHeader = c.req.header('Authorization');
  if (!authHeader) throw new Error("Unauthorized: No credentials provided");

  if (authHeader.startsWith('Passcode ')) {
    const passcode = authHeader.replace('Passcode ', '').trim();
    try {
      const { db, secrets, settings } = await import('./db/index.js');
      const { eq } = await import('drizzle-orm');

      let dbPasscode: string | null = null;
      try {
        const [passcodeSecret] = await db.select().from(secrets).where(eq(secrets.key, 'access_passcode')).limit(1);
        if (passcodeSecret?.value) {
          dbPasscode = passcodeSecret.value;
        }
      } catch (err) {
        logger.warn("[Auth] Failed to fetch passcode from secrets table:", err);
      }

      if (!dbPasscode) {
        try {
          const [globalSettings] = await db.select().from(settings).limit(1);
          if (globalSettings?.accessPasscode) {
            dbPasscode = globalSettings.accessPasscode;
          }
        } catch (err) {
          logger.warn("[Auth] Failed to fetch passcode from settings table:", err);
        }
      }

      if (dbPasscode && passcode === dbPasscode) {
        const mockUser = { id: 'staff', email: 'staff@local' };
        c.set('user', mockUser);
        return mockUser;
      }
    } catch (e: unknown) {
      logger.error("[Auth] Database error verifying passcode:", e);
    }
    throw new Error("Unauthorized: Invalid passcode");
  }
  
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
        return c.json({ success: false, error: error.message }, 401);
    }
}
