import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../shared/envSchema.js";

const serverEnv = getServerEnv(process.env);

export async function requireRealUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) throw new Error("Unauthorized: No credentials provided");
  
  // Use anon key for session verification, valid token will prove identity
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.VITE_SUPABASE_ANON_KEY || ''; // Use anon key for session check
  const supabase = createClient(supabaseUrl!, supabaseKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) throw new Error("Unauthorized: Invalid/Expired Session");
  
  return user;
}

export async function adminAuthMiddleware(c: any, next: any) {
    // Whitelist public-accessible admin routes
    if (c.req.path.endsWith('/admin/settings/get-keys')) {
        await next();
        return;
    }

    try {
        await requireRealUser(c);
        await next();
    } catch (e: any) {
        console.error(`[Auth Error] ${c.req.path}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 401);
    }
}
