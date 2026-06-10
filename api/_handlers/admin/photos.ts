import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase";

export const adminPhotos = new Hono();

adminPhotos.get("/photo-ai-result/:photoId", async (c) => {
    try {
        const { photoId } = c.req.param();
        if (!photoId) return c.json({ success: false, error: "photoId is required" }, 400);

        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from("photo_ai_results")
            .select("*")
            .eq("photo_id", photoId)
            .maybeSingle();

        if (error) {
            console.warn(`[get-photo-ai-result-failed]`, error.message);
            return c.json({ success: true, data: null });
        }

        return c.json({ success: true, data });
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

      // Clean up associated photo_ai_results to avoid orphan rows and storage leaks
      try {
        await supabase
          .from("photo_ai_results")
          .delete()
          .in("photo_id", ids);
      } catch (err) {
        console.warn("[delete-photos] Clean up photo_ai_results failed:", err);
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
                console.error(`Failed to delete key ${key} from R2 during database delete:`, r2Err);
              }
            }));
          }
        }
      }

      return c.json({ success: true, count: ids.length });
    } catch(e: unknown) {
      console.error("[delete-photos] failed:", e);
      return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});
