import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase.js";

export const adminPhotos = new Hono();

adminPhotos.get("/photo-ai-result/:photoId", async (c) => {
    try {
        const { photoId } = c.req.param();
        if (!photoId) return c.json({ success: false, error: "photoId is required" }, 400);

        const supabase = await getSupabaseAdmin();
        
        // 1. Try querying ai_audit_logs first (as it's the modern way)
        let { data: auditLog, error: auditError } = await supabase
            .from("ai_audit_logs")
            .select("*")
            .eq("photo_id", photoId)
            .eq("status", "success")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!auditError && auditLog) {
            let rawResult = '';
            if (auditLog.raw_storage_path) {
                const { getFromR2 } = await import("../../_lib/storage.js");
                const r2Content = await getFromR2(auditLog.raw_storage_path);
                if (r2Content) {
                    rawResult = r2Content;
                }
            }
            if (!rawResult && auditLog.error_message) {
                // If R2 upload failed in the past, executor might save the raw JSON/content in error_message
                rawResult = auditLog.error_message;
            }
            if (!rawResult && auditLog.cleaned_output) {
                rawResult = typeof auditLog.cleaned_output === 'object' 
                    ? JSON.stringify(auditLog.cleaned_output, null, 2)
                    : String(auditLog.cleaned_output);
            }
            if (!rawResult) {
                // Return a reconstructed JSON object as ultimate fallback so it's never blank
                rawResult = JSON.stringify({
                    status: "success",
                    model: auditLog.model || "Gemini-2.0",
                    trace_id: auditLog.trace_id,
                    prompt_version: auditLog.prompt_version || "v1",
                    analysis_timestamp: auditLog.created_at,
                    warning: "Raw stream in R2 was unreachable, reconstructed from structured database values.",
                    structured_data: auditLog.cleaned_output || {}
                }, null, 2);
            }

            const resultObj = {
                photo_id: photoId,
                raw_result: rawResult,
                parsed_data: auditLog.cleaned_output || null,
                created_at: auditLog.created_at
            };
            return c.json({ success: true, data: resultObj });
        }

        // 2. Fallback to older system_logs
        let { data: rawLogs, error } = await supabase
            .from("system_logs")
            .select("*")
            .eq("context", "AI_Executor")
            .eq("error_message", `AI analysis completed for photo ${photoId}`)
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) {
            logger.warn(`[get-photo-ai-result-failed]`, error.message);
            return c.json({ success: true, data: null });
        }

        if (!rawLogs || rawLogs.length === 0) {
            // Slower fallback query using JSONB unpacking for older or legacy logs
            const fallbackRes = await supabase
                .from("system_logs")
                .select("*")
                .eq("context", "AI_Executor")
                .filter("metadata->>photo_id", "eq", photoId)
                .order("created_at", { ascending: false })
                .limit(1);
            
            if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
                rawLogs = fallbackRes.data;
            }
        }

        const logRecord = rawLogs?.[0];
        if (!logRecord || !logRecord.metadata) {
            return c.json({ success: true, data: null });
        }

        const resultObj = {
            photo_id: photoId,
            raw_result: logRecord.metadata.raw_result || '',
            parsed_data: logRecord.metadata.parsed_data || null,
            created_at: logRecord.created_at
        };

        return c.json({ success: true, data: resultObj });
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

adminPhotos.post("/photo/update", async (c) => {
    try {
        const { id, updates } = await c.req.json();
        if (!id) return c.json({ success: false, error: "id is required" }, 400);

        const supabase = await getSupabaseAdmin();
        const { error } = await supabase.from("furniture_items").update(updates).eq("id", id);
        if (error) throw error;
        return c.json({ success: true });
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

adminPhotos.post("/delete-photos", async (c) => {
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

      // Clean up associated system_logs to avoid orphan rows and storage leaks
      try {
        await supabase
          .from("system_logs")
          .delete()
          .eq("context", "AI_Executor")
          .filter("metadata->>photo_id", "in", `(${ids.map(id => `"${id}"`).join(',')})`);
      } catch (err) {
        logger.warn("[delete-photos] Clean up associated system_logs failed:", err);
      }

      const { error: deleteError } = await supabase
        .from("furniture_items")
        .delete()
        .in("id", ids);

      if (deleteError) throw deleteError;

      if (photosData && photosData.length > 0) {
        const { getR2Client } = await import("../../_lib/storage.js");
        const s3Client = await getR2Client();
        const bucketName = process.env.R2_BUCKET_NAME;
        if (bucketName) {
          const fileKeys = photosData
            .map((p: any) => {
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
                logger.error(`Failed to delete key ${key} from R2 during database delete:`, r2Err);
              }
            }));
          }
        }
      }

      return c.json({ success: true, count: ids.length });
    } catch(e: unknown) {
      logger.error("[delete-photos] failed:", e);
      return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

adminPhotos.get("/error-events", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300);
        if (error) throw error;
        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminPhotos.post("/error-events-clear", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('system_logs')
            .delete()
            .not('id', 'is', null)
            .select('id');
        if (error) throw error;
        return c.json({ success: true, count: data?.length || 0 });
    } catch (e: any) {
        logger.error('[Admin] Clear logs failed:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

