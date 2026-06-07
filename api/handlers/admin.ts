import { Hono } from "hono";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getR2Client } from "../lib/storage.js";

export const admin = new Hono();

admin.get("/error-events", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('error_events')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

admin.post("/error-events/clear", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { error } = await supabase
            .from('error_events')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

admin.post("/delete-photos", async (c) => {
    try {
      const { ids } = await c.req.json();
      if (!ids || !Array.isArray(ids)) {
        return c.json({ success: false, error: "ids array required" }, 400);
      }

      const supabase = await getSupabaseAdmin();
      
      const { data: photosData, error: fetchError } = await supabase
        .from("furniture_items")
        .select("id, image_url")
        .in("id", ids);

      if (fetchError) throw fetchError;

      const { error: deleteError } = await supabase
        .from("furniture_items")
        .delete()
        .in("id", ids);

      if (deleteError) throw deleteError;

      if (photosData && photosData.length > 0) {
        const s3Client = await getR2Client();
        const bucketName = process.env.R2_BUCKET_NAME;
        if (bucketName) {
          const fileKeys = photosData
            .map(p => {
              if (!p.image_url) return null;
              try {
                const url = new URL(p.image_url);
                return url.pathname.replace(/^\//, '');
              } catch {
                if (p.image_url.includes("photox/public/")) {
                  return "photox/public/" + p.image_url.split("photox/public/")[1];
                }
                return null;
              }
            })
            .filter(Boolean) as string[];

          if (fileKeys.length > 0) {
            await Promise.all(fileKeys.map(async (key) => {
              try {
                const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
                const command = new DeleteObjectCommand({
                  Bucket: bucketName,
                  Key: key,
                });
                await s3Client.send(command, { abortSignal: AbortSignal.timeout(5000) });
              } catch (r2Err) {
                console.error(`Failed to delete key ${key} from R2 during database delete:`, r2Err);
              }
            }));
          }
        }
      }

      return c.json({ success: true, count: ids.length });
    } catch(e: any) {
      console.error("[delete-photos] failed:", e);
      return c.json({ success: false, error: e.message }, 500);
    }
});

admin.get("/settings/get-keys", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data: secrets } = await supabase.from('secrets').select('key, value');
        const configuredProviders = secrets?.map(s => s.key) || [];
        
        const { data: settings } = await supabase.from('settings').select('api_key').eq('id', 1).maybeSingle();
        const hasOpenrouter = configuredProviders.includes('openrouter') || !!settings?.api_key;
        const hasAgnes = configuredProviders.includes('agnes');
        
        const primarySecret = secrets?.find(s => s.key === 'PRIMARY_AI_PROVIDER');
        
        return c.json({
            success: true,
            keysStatus: { 
                agnes: hasAgnes, 
                openrouter: hasOpenrouter, 
                primaryProvider: primarySecret?.value || 'openrouter' 
            }
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

admin.post("/settings/save-key", async (c) => {
    try {
        const { provider, apiKey } = await c.req.json();
        if (!provider || !apiKey) return c.json({ success: false, error: "缺少必要參數" }, 400);

        const supabase = await getSupabaseAdmin();
        const { encrypt } = await import('../lib/encryption.js');
        const encryptedKey = encrypt(apiKey);
        
        const { error } = await supabase.from('secrets').upsert({ 
            key: provider, 
            value: encryptedKey,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        
        return c.json({ 
            success: true, 
            message: `密鑰已加密保存！` 
        });
    } catch (e: any) {
        console.error("Save key failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

