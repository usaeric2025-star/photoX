import { Hono } from "hono";
import { cors } from "hono/cors";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../shared/envSchema";
import { logTraffic } from "../lib/trafficCapture";

// Validate env at module level
const serverEnv = getServerEnv(process.env);

export async function getR2Client() {
  let r2Endpoint = serverEnv.R2_ENDPOINT;
  let r2AccessKeyId = serverEnv.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = serverEnv.R2_SECRET_ACCESS_KEY || '';
  
  if (r2Endpoint && !r2Endpoint.startsWith("http://") && !r2Endpoint.startsWith("https://")) {
    r2Endpoint = `https://${r2Endpoint}`;
  }

  if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
    const temp = r2AccessKeyId;
    r2AccessKeyId = r2SecretAccessKey;
    r2SecretAccessKey = temp;
  }

  if (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint) {
    console.error("[getR2Client] R2 Credentials missing!", { endpoint: !!r2Endpoint, key: !!r2AccessKeyId, secret: !!r2SecretAccessKey });
    throw new Error("R2 storage credentials missing. Please check R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY env variables.");
  }

  return new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true,
    maxAttempts: 1,
  });
}

async function getSupabaseAdmin() {
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing");
  }
  return createClient(supabaseUrl, supabaseKey);
}

// --- Hono App Implementation ---
export const app = new Hono().basePath("/api");

// Middleware
app.use("*", cors());
app.use("*", async (c, next) => {
    // 1% sample rate for production, 100% for dev
    if (serverEnv.NODE_ENV === 'production') {
        if (Math.random() < 0.01) logTraffic(c.req, null);
    } else {
        logTraffic(c.req, null);
    }
    await next();
});

// Global Exception Handler
app.onError((err, c) => {
  console.error('[Hono Global Error]', {
    message: err.message,
    stack: err.stack,
    context: c.req.path
  });
  
  return c.json({
    success: false,
    error: {
      message: err.message,
      code: 'INTERNAL_SERVER_ERROR'
    }
  }, 500);
});

// --- API Routes ---
app.post("/upload-presign", async (c) => {
    try {
      const { photoId, fileKey, contentType } = await c.req.json();
      if (!photoId && !fileKey) return c.json({ error: "photoId or fileKey required" }, 400);
      
      const fileName = fileKey ? `photox/public/${fileKey}` : `photox/public/${photoId}.webp`;
      const s3Client = await getR2Client();
      
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
      });
      
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      
      return c.json({ success: true, data: { uploadUrl, publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/upload-direct", async (c) => {
    try {
      const { base64Data, fileKey, contentType } = await c.req.json();
      if (!base64Data) return c.json({ success: false, error: "base64Data required" }, 400);

      const base64Content = base64Data.split(',')[1] || base64Data;
      const buffer = Buffer.from(base64Content, 'base64');
      
      const fileName = fileKey ? `photox/public/${fileKey}` : `photox/public/upload_${Date.now()}.webp`;
      const s3Client = await getR2Client();
      
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
        Body: buffer
      });
      
      await s3Client.send(command, { abortSignal: AbortSignal.timeout(8000) });
      
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      return c.json({ success: true, data: { publicUrl } });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/r2-delete", async (c) => {
    try {
      const { fileKeys } = await c.req.json();
      if (!fileKeys || !Array.isArray(fileKeys)) {
        return c.json({ success: false, error: "fileKeys array required" }, 400);
      }
      
      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");
      
      await Promise.all(fileKeys.map(async (key) => {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          });
          return s3Client.send(command, { abortSignal: AbortSignal.timeout(5000) });
      }));
      
      return c.json({ success: true });
    } catch(e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/photos", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase.from("furniture_items").select("*").limit(50);
      if (error) throw error;
      return c.json(data);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/admin/diagnose", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const issues: any[] = [];
      const [
        { data: photos, error: pErr },
        { data: groups, error: gErr },
        { data: categories, error: cErr },
        { data: manufacturers, error: mErr },
      ] = await Promise.all([
        supabase.from("furniture_items").select("id, group_id, category_id, manufacturer_id, image_hash, image_url, thumb_url, thumb_hash, name"),
        supabase.from("groups").select("id, name, member_count"),
        supabase.from("categories").select("id"),
        supabase.from("manufacturers").select("id"),
      ]);

      if (pErr) throw pErr;
      if (!photos) throw new Error("Could not fetch photos");
      
      const groupIds = new Set(groups?.map(g => String(g.id)) || []);
      const categoryIds = new Set(categories?.map(c => String(c.id)) || []);
      const manufacturerIds = new Set(manufacturers?.map(m => String(m.id)) || []);
      
      // Orphaned Photos
      const orphanedPhotos = photos.filter(p => p.group_id && !groupIds.has(String(p.group_id)));
      if (orphanedPhotos.length > 0) {
        issues.push({ id: 'orphaned_photos', category: 'integrity', severity: 'P0', title: '孤儿照片', description: '照片指向了不存在的合组', affectedCount: orphanedPhotos.length, sampleIds: orphanedPhotos.slice(0, 5).map(p => p.id), autoFixable: false });
      }

      // Empty Groups
      const photosByGroup = new Map<string, number>();
      photos.forEach(p => { if (p.group_id) { const gid = String(p.group_id); photosByGroup.set(gid, (photosByGroup.get(gid) || 0) + 1); } });
      const emptyGroups = groups?.filter(g => !photosByGroup.has(String(g.id))) || [];
      if (emptyGroups.length > 0) {
        issues.push({ id: 'empty_groups', category: 'integrity', severity: 'P0', title: '空合组', description: '有些合组中没有任何照片', affectedCount: emptyGroups.length, sampleIds: emptyGroups.slice(0, 5).map(g => String(g.id)), autoFixable: true });
      }

      // member_count mismatch
      const mismatchedGroups = groups?.filter(g => {
         const actualCount = photosByGroup.get(String(g.id)) || 0;
         const storedCount = g.member_count ?? 0;
         return actualCount !== storedCount;
      }) || [];
      if (mismatchedGroups.length > 0) {
         issues.push({ id: 'member_count_mismatch', category: 'consistency', severity: 'P0', title: '成员数不匹配', description: '合组记录的成员数量与实际照片数量不符', affectedCount: mismatchedGroups.length, sampleIds: mismatchedGroups.slice(0, 5).map(g => String(g.id)), autoFixable: true });
      }

      return c.json({ timestamp: Date.now(), totalIssues: issues.length, issuesBySeverity: { P0: issues.filter(i => i.severity === 'P0').length, P1: issues.filter(i => i.severity === 'P1').length, P2: 0, P3: 0 }, issues });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/admin/diagnose-r2", async (c) => {
    try {
      const issues: string[] = [];
      const envKeys = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_PREFIX"];
      const configState: Record<string, any> = {};
      
      for (const key of envKeys) {
        const val = process.env[key] || (serverEnv as any)[key];
        configState[key] = { exists: !!val, length: val ? String(val).length : 0 };
        if (!val) issues.push(`环境变量 ${key} 缺失`);
      }

      if (issues.length > 0) return c.json({ success: false, stage: "env_check", error: "存储配置不完整", details: { issues, configState } });

      let s3Client;
      try {
        s3Client = await getR2Client();
      } catch (clientErr: any) {
        return c.json({ success: false, stage: "instantiation", error: clientErr.message, details: { configState } });
      }

      try {
        const bucketName = serverEnv.R2_BUCKET_NAME;
        const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await s3Client.send(command, { abortSignal: AbortSignal.timeout(4000) });
      } catch (s3Err: any) {
        return c.json({ success: false, stage: "connection", error: s3Err.message, details: { configState, s3Message: s3Err.message } });
      }

      return c.json({ success: true, stage: "ready", message: "R2 连接成功！", details: { configState } });
    } catch (globalErr: any) {
      return c.json({ success: false, error: globalErr.message });
    }
});

app.post("/admin/repair/:issueId", async (c) => {
    try {
      const issueId = c.req.param('issueId');
      const supabase = await getSupabaseAdmin();
      
      if (issueId === 'member_count_mismatch') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const counts = new Map<string, number>();
         photos?.forEach(p => { if (p.group_id) { const gid = String(p.group_id); counts.set(gid, (counts.get(gid) || 0) + 1); } });
         const { data: groups } = await supabase.from("groups").select("id");
         if (groups) await Promise.all(groups.map(g => supabase.from("groups").update({ member_count: counts.get(String(g.id)) || 0 }).eq("id", g.id)));
         return c.json({ success: true, message: '成员数同步完成' });
      }

      if (issueId === 'empty_groups') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const photoGroupIds = new Set(photos?.map(p => String(p.group_id)).filter(Boolean));
         const { data: groups } = await supabase.from("groups").select("id");
         const emptyGroupIds = groups?.filter(g => !photoGroupIds.has(String(g.id))).map(g => g.id) || [];
         if (emptyGroupIds.length > 0) await supabase.from("groups").delete().in("id", emptyGroupIds);
         return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
      }

      return c.json({ success: false, error: 'Unsupported repair' }, 400);
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.get("/health", (c) => {
    return c.json({ success: true, data: { status: "ok", uptime: process.uptime(), timestamp: Date.now() } });
});

app.get("/storage/audit", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

      const { data: photos, error } = await supabase.from("furniture_items").select("id, image_url, thumb_url");
      if (error) throw error;

      const r2Files: Set<string> = new Set();
      const dbFiles: Set<string> = new Set();

      photos.forEach(p => {
        if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
        if (p.thumb_url?.includes("r2")) dbFiles.add(p.thumb_url.split("/").pop()!);
      });

      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }),
          { abortSignal: AbortSignal.timeout(6000) }
        );
        list.Contents?.forEach(c => { if (c.Key) r2Files.add(c.Key.split("/").pop()!); });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      let healthy = 0, missing = 0, orphans = 0;
      dbFiles.forEach(f => { if (r2Files.has(f)) healthy++; else missing++; });
      r2Files.forEach(f => { if (!dbFiles.has(f)) orphans++; });

      return c.json({ success: true, data: { healthy, missing, orphans } });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/storage/clean", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const s3Client = await getR2Client();
      const bucket = serverEnv.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME missing");

      const { data: photos, error } = await supabase.from("furniture_items").select("image_url, thumb_url");
      if (error) throw error;

      const dbFiles: Set<string> = new Set();
      photos.forEach(p => {
        if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
        if (p.thumb_url?.includes("r2")) dbFiles.add(p.thumb_url.split("/").pop()!);
      });

      const r2FilesToClean: string[] = [];
      let continuationToken: string | undefined;
      do {
        const list = await s3Client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }),
          { abortSignal: AbortSignal.timeout(6000) }
        );
        list.Contents?.forEach(c => {
          if (c.Key) {
            const filename = c.Key.split("/").pop();
            if (filename && !dbFiles.has(filename)) r2FilesToClean.push(c.Key);
          }
        });
        continuationToken = list.NextContinuationToken;
      } while (continuationToken);

      if (r2FilesToClean.length > 0) {
        await Promise.all(r2FilesToClean.map(async (key) => {
          return s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(4000) });
        }));
      }

      return c.json({ success: true, data: { cleanedCount: r2FilesToClean.length, files: r2FilesToClean } });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

app.post("/ai/analyze", async (c) => {
    try {
      const { base64Image, customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const modelName = customModel || "google/gemini-1.5-flash";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "X-Title": "PhotoX AI" },
        body: JSON.stringify({ model: modelName.replace('openrouter/', ''), messages: [{ role: "user", content: [{ type: "text", text: promptText }, { type: "image_url", image_url: { url: base64Image } } ] }], response_format: { type: "json_object" }, max_tokens: 1024 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      return c.json(await response.json());
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post("/ai/translate", async (c) => {
    try {
      const { customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const modelName = customModel || "google/gemini-1.5-flash";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelName.replace('openrouter/', ''), messages: [{ role: "user", content: promptText }], max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post("/ai/analyze-group", async (c) => {
    try {
      const { photoDetails } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const prompt = `你是一个产品分析专家...分析结果以JSON返回...${photoDetails}`;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "google/gemini-2.0-flash-exp:free", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post("/ai/analyze-photo-v2", async (c) => {
    try {
      const { photoDetail } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      const prompt = `你是一个产品分析专家...分析结果以JSON返回...${photoDetail}`;
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "google/gemini-2.0-flash-exp:free", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

export type AppType = typeof app;
