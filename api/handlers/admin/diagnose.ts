import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../lib/supabase.js";
import { getR2Client } from "../../lib/storage.js";
import { getServerEnv } from "../../shared/envSchema.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

const serverEnv = getServerEnv(process.env);
export const adminDiagnose = new Hono();

adminDiagnose.get("/", async (c) => {
    try {
      const supabase = await getSupabaseAdmin();
      const issues: any[] = [];
      const [
        { data: photos, error: pErr },
        { data: groups, error: gErr },
        { data: categories, error: cErr },
        { data: manufacturers, error: mErr },
      ] = await Promise.all([
        supabase.from("furniture_items").select("id, group_id, category_id, manufacturer_id, image_hash, image_url, thumb_hash, name, item_code"),
        supabase.from("groups").select("id, name, member_count"),
        supabase.from("categories").select("id"),
        supabase.from("manufacturers").select("id"),
      ]);

      if (pErr) throw pErr;
      if (!photos) throw new Error("Could not fetch photos");
      
      const groupIds = new Set(groups?.map(g => String(g.id)) || []);
      
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

      // Ghost Records (No URL AND No Hash)
      const completeGhosts = photos.filter(p => (!p.image_url || p.image_url === '') && (!p.image_hash || p.image_hash === ''));
      if (completeGhosts.length > 0) {
        issues.push({ 
          id: 'ghost_records', 
          category: 'integrity', 
          severity: 'P0', 
          title: '完全幽灵记录', 
          description: '数据库中有记录但完全没有图片链接和哈希，属于无用垃圾数据', 
          affectedCount: completeGhosts.length, 
          sampleIds: completeGhosts.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
      }

      // Incomplete Records (Has URL but No Hash - DANGEROUS TO DELETE)
      const missingHashes = photos.filter(p => p.image_url && (!p.image_hash || p.image_hash.trim() === ''));
      if (missingHashes.length > 0) {
        issues.push({ 
          id: 'missing_hashes', 
          category: 'integrity', 
          severity: 'P1', 
          title: '缺少哈希的记录', 
          description: '这些照片有图片链接但没有哈希值，可能导致排重失效。您可以尝试自动修复（重新计算）或直接删除这些记录。', 
          affectedCount: missingHashes.length, 
          sampleIds: missingHashes.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
      }

      // Incomplete Records (Has Hash but No URL - GHOST)
      const missingUrls = photos.filter(p => p.image_hash && (!p.image_url || p.image_url === ''));
      if (missingUrls.length > 0) {
        issues.push({ 
          id: 'missing_urls', 
          category: 'integrity', 
          severity: 'P0', 
          title: '缺少链接的照片', 
          description: '这些记录有哈希但没有图片链接，无法正常显示。', 
          affectedCount: missingUrls.length, 
          sampleIds: missingUrls.slice(0, 5).map(p => p.id), 
          autoFixable: true 
        });
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


      // Non-standard Item Codes
      const compliantRegex = /^X-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
      const nonStandardCodes = photos.filter(p => p.item_code && !compliantRegex.test(p.item_code));
      if (nonStandardCodes.length > 0) {
        issues.push({
          id: 'non_standard_item_codes',
          category: 'consistency',
          severity: 'P2',
          title: '系统编号格式不规范',
          description: `检测到有 ${nonStandardCodes.length} 条记录使用了旧格式（如 FUR-xxx）或非标准格式的系统编号。点击修复将统一收敛为 X-XXXXXXXX 格式。`,
          affectedCount: nonStandardCodes.length,
          sampleIds: nonStandardCodes.slice(0, 5).map(p => p.id),
          autoFixable: true
        });
      }

      return c.json({ timestamp: Date.now(), totalIssues: issues.length, issuesBySeverity: { P0: issues.filter(i => i.severity === 'P0').length, P1: issues.filter(i => i.severity === 'P1').length, P2: issues.filter(i => i.severity === 'P2').length, P3: 0 }, issues });
    } catch (e: any) {
      return c.json({ success: false, error: e.message }, 500);
    }
});

adminDiagnose.get("/r2", async (c) => {
    try {
      const issues: string[] = [];
      const envKeys = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_PREFIX"];
      const configState: Record<string, any> = {};
      
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
      } catch (clientErr: any) {
        return c.json({ success: false, stage: "instantiation", error: clientErr.message, details: { configState } });
      }

      try {
        const bucketName = process.env.R2_BUCKET_NAME;
        const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
        const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await s3Client.send(command, { abortSignal: AbortSignal.timeout(4000) });
      } catch (s3Err: any) {
        return c.json({ success: false, stage: "connection", error: s3Err.message, details: { configState, s3Message: s3Err.message } });
      }

      return c.json({ success: true, stage: "ready", message: "R2 连接成功！", details: { configState } });
    } catch (globalErr: any) {
      return c.json({ success: false, error: globalErr.message || "未知诊断错误" });
    }
});
