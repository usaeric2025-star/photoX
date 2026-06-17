import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db, furnitureItems, groups as groupsTable, categories as categoriesTable, manufacturers as manufacturersTable, photoTags as photoTagsTable, secrets as secretsTable } from '../../../src/db/index.js';
import { getR2Client } from "../../_lib/storage.js";
import { getServerEnv } from "../../_shared/envSchema.js";
import { diagnosticRegistry } from "../../_lib/diagnostics/registry.js";
import { DiagnosticIssue, PhotoRecord, GroupRecord, CategoryRecord, ManufacturerRecord, PhotoTagRecord } from "../../_lib/diagnostics/types.js";

const serverEnv = getServerEnv(process.env);
export const adminDiagnose = new Hono();

adminDiagnose.get("/", async (c) => {
    try {
      const issues: DiagnosticIssue[] = [];
      
      const [
        pData,
        gData,
        cData,
        mData,
        secretData,
        ptData,
      ] = await Promise.all([
        db.select().from(furnitureItems),
        db.select().from(groupsTable),
        db.select().from(categoriesTable),
        db.select().from(manufacturersTable),
        db.select({ key: secretsTable.key }).from(secretsTable).limit(1),
        db.select().from(photoTagsTable),
      ]);

      // Map Drizzle results to snake_case for task compatibility
      const photos: PhotoRecord[] = pData.map(p => ({
        id: p.id,
        group_id: p.groupId || undefined,
        category_id: p.categoryId || undefined,
        manufacturer_id: p.manufacturerId || undefined,
        image_hash: p.imageHash || undefined,
        image_url: p.imageUrl || undefined,
        thumb_hash: p.thumbHash || undefined,
        name: p.name as any,
        item_code: p.itemCode || undefined,
        is_group_cover: p.isGroupCover || undefined,
        created_at: p.createdAt?.toISOString(),
        updated_at: p.updatedAt?.toISOString(),
        user_id: p.userId || undefined
      }));

      const groups: GroupRecord[] = gData.map(g => ({
        id: g.id,
        name: g.name as any,
        cover_photo_id: g.coverPhotoId || undefined,
        created_at: g.createdAt?.toISOString(),
        updated_at: g.updatedAt?.toISOString()
      }));

      const categories: CategoryRecord[] = cData.map(cat => ({
        id: cat.id,
        code: cat.code || '',
        name_zh: cat.nameZh || ''
      }));

      const manufacturers: ManufacturerRecord[] = mData.map(m => ({
        id: m.id,
        name: m.name || ''
      }));

      const photoTags: PhotoTagRecord[] = ptData.map(pt => ({
        id: `${pt.photoId ?? ''}_${pt.tagId ?? ''}`,
        photo_id: pt.photoId ?? '',
        tag_id: pt.tagId ?? ''
      }));

      // Run modular diagnostics
      // Note: passing null for supabase as it should be deprecated, tasks should use pre-fetched data
      const diagnosticResults = await Promise.all(
        diagnosticRegistry.map(task => 
          task.run({
            supabase: null as any, 
            photos,
            groups,
            categories,
            manufacturers,
            photoTags
          })
        )
      );
      diagnosticResults.forEach(res => { if (res) issues.push(res); });

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

adminDiagnose.get("/db-schema", async (c) => {
    try {
        const table = c.req.query("table") || "furniture_items";
        const columns = await db.execute(sql`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = ${table}
            ORDER BY ordinal_position;
        `);
        return c.json({ success: true, table, columns });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
