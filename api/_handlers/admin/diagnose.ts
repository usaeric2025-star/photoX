import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase.js";
import { getR2Client } from "../../_lib/storage.js";
import { getServerEnv } from "../../_shared/envSchema.js";
import { diagnosticRegistry } from "../../_lib/diagnostics/registry.js";
import { DiagnosticIssue, PhotoRecord, GroupRecord, CategoryRecord, ManufacturerRecord, PhotoTagRecord } from "../../_lib/diagnostics/types.js";

const serverEnv = getServerEnv(process.env);
export const adminDiagnose = new Hono();

adminDiagnose.get("/", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const issues: DiagnosticIssue[] = [];
      
      const queryTimeout = 25000; 
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), queryTimeout);

      try {
        const [
          { data: pData, error: pErr },
          { data: gData, error: gErr },
          { data: cData, error: cErr },
          { data: mData, error: mErr },
          { error: secretErr },
          { data: ptData, error: ptErr },
        ] = await Promise.all([
          supabase.from("furniture_items").select("id, group_id, category_id, manufacturer_id, image_hash, image_url, thumb_hash, name, item_code, is_group_cover").abortSignal(controller.signal),
          supabase.from("groups").select("id, name, cover_photo_id").abortSignal(controller.signal),
          supabase.from("categories").select("id").abortSignal(controller.signal),
          supabase.from("manufacturers").select("id").abortSignal(controller.signal),
          supabase.from("secrets").select("key").limit(1).abortSignal(controller.signal),
          supabase.from("photo_tags").select("photo_id, tag_id").abortSignal(controller.signal),
        ]);

        clearTimeout(timeoutId);

        if (pErr) throw pErr;
        if (gErr) throw gErr;
        if (ptErr) throw ptErr;
        
        const photos = (pData || []) as PhotoRecord[];
        const groups = (gData || []) as GroupRecord[];
        const categories = (cData || []) as CategoryRecord[];
        const manufacturers = (mData || []) as ManufacturerRecord[];
        const photoTags = (ptData || []) as PhotoTagRecord[];

        // Run modular diagnostics
        const diagnosticResults = await Promise.all(
          diagnosticRegistry.map(task => 
            task.run({
              supabase,
              photos,
              groups,
              categories,
              manufacturers,
              photoTags
            })
          )
        );
        diagnosticResults.forEach(res => { if (res) issues.push(res); });
      } catch (innerErr: unknown) {
        clearTimeout(timeoutId);
        if (innerErr instanceof Error && innerErr.name === 'AbortError') {
          return c.json({ success: false, error: "數據庫查詢超時，請稍後重試 (Timeout)" }, 504);
        }
        throw innerErr;
      }

      return c.json({ 
        timestamp: Date.now(), 
        totalIssues: issues.length, 
        issuesBySeverity: { 
          P0: issues.filter(i => i.severity === 'P0').length, 
          P1: issues.filter(i => i.severity === 'P1').length, 
          P2: issues.filter(i => i.severity === 'P2').length, 
          P3: 0 
        }, 
        issues 
      });
      } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown diagnostic error' }, 500);
      }
});

adminDiagnose.get("/r2", async (c) => {
    try {
      const issues: string[] = [];
      const envKeys = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_PREFIX"];
      const configState: Record<string, unknown> = {};
      
      for (const key of envKeys) {
        // Use process.env directly to avoid throwing on missing key
        const val = process.env[key];
        configState[key] = { exists: !!val, length: val ? String(val).length : 0 };
        if (!val) issues.push(`环境变量 ${key} 缺失`);
      }

      if (issues.length > 0) return c.json({ success: false, stage: "env_check", error: "存储配置不完整", details: { issues, configState } });

      let s3Client;
      try {
        s3Client = await getR2Client();
      } catch (clientErr: unknown) {
        return c.json({ success: false, stage: "instantiation", error: (clientErr as Error).message, details: { configState } });
      }

      try {
        const bucketName = process.env.R2_BUCKET_NAME;
        const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
        const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await s3Client.send(command, { abortSignal: AbortSignal.timeout(4000) });
      } catch (s3Err: unknown) {
        return c.json({ success: false, stage: "connection", error: (s3Err as Error).message, details: { configState, s3Message: (s3Err as Error).message } });
      }

      return c.json({ success: true, stage: "ready", message: "R2 连接成功！", details: { configState } });
    } catch (globalErr: unknown) {
      return c.json({ success: false, error: (globalErr as Error).message || "未知诊断错误" });
    }
});
