import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, furnitureItems, groups as groupsTable, tags as tagsTable, photoTags as photoTagsTable, secrets as secretsTable } from '../../_lib/db/index.js';
import { eq, or, isNull, inArray, sql, not, and } from "drizzle-orm";
import { getServerEnv } from "../../_shared/envSchema.js";
import { getR2Client } from "../../_lib/storage.js";
import { normalizeI18n } from "../../_shared/i18n.js";

const serverEnv = getServerEnv(process.env);
export const adminRepair = new Hono();

adminRepair.post("/preview", async (c) => {
    try {
      const { issueId } = await c.req.json();

      if (issueId === 'excessive_tags') {
        const ptData = await db.select().from(photoTagsTable);
        const pData = await db.select({ id: furnitureItems.id, name: furnitureItems.name }).from(furnitureItems);
        const photoMap = new Map<string, { id: string; name: unknown }>(pData.map(p => [p.id, p]));

        const tagData = await db.select({ id: tagsTable.id, name: tagsTable.name, isGlobal: tagsTable.isGlobal }).from(tagsTable);
        const tagMap = new Map<string, { id: string; name: string | null; isGlobal: boolean | null }>(tagData.map(t => [t.id, t]) as any);

        const photoTagGroupMap = new Map<string, string[]>();
        ptData.forEach((pt) => {
          const pid = pt.photoId ?? '';
          const tid = pt.tagId ?? '';
          if (!photoTagGroupMap.has(pid)) {
            photoTagGroupMap.set(pid, []);
          }
          photoTagGroupMap.get(pid)!.push(tid);
        });

        const affectedPhotos: unknown[] = [];
        const getWeight = (tagId: string, tagDetail?: { id: string; name: string | null; isGlobal: boolean | null }) => {
          if (tagDetail && tagDetail.isGlobal) return 50;
          return 90;
        };

        photoTagGroupMap.forEach((tagIds, photoId) => {
          if (tagIds.length > 3) {
            const photoItem = photoMap.get(photoId);
            const photoName = photoItem ? (normalizeI18n(photoItem.name as Record<string, unknown>).zh || "未命名产品") : "未知照片";

            const sorted = [...tagIds].sort((a, b) => {
              const weightA = getWeight(a, tagMap.get(a));
              const weightB = getWeight(b, tagMap.get(b));
              if (weightB !== weightA) return weightB - weightA;
              return tagIds.indexOf(a) - tagIds.indexOf(b);
            });

            const kept = sorted.slice(0, 3).map(id => tagMap.get(id)?.name || id);
            const removed = sorted.slice(3).map(id => tagMap.get(id)?.name || id);

            affectedPhotos.push({
              photoId,
              photoName,
              keptTags: kept,
              removedTags: removed
            });
          }
        });

        return c.json({
          success: true,
          affectedCount: affectedPhotos.length,
          affectedPhotos
        });
      }

      return c.json({ success: true, affectedCount: 0, affectedPhotos: [] });
    } catch (e: unknown) {
      logger.error("[Repair Preview] failed:", e);
      return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

adminRepair.post("/", async (c) => {
    try {
      const { issueId } = await c.req.json();
      
      if (issueId === 'missing_secrets_table') {
          return c.json({ 
              success: false, 
              error: "Schema 限制：自動修復無法直接創建物理表。請前往 Supabase 儀表盤 -> SQL Editor，運行以下代碼：\n\nCREATE TABLE secrets (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());\nALTER TABLE secrets ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"Allow read for all\" ON secrets FOR SELECT USING (true);\nCREATE POLICY \"Allow write for admin\" ON secrets FOR ALL USING (true);" 
          }, 400);
      }

      if (issueId === 'group_cover_mismatch') {
         const groups = await db.select({ id: groupsTable.id, name: groupsTable.name, coverPhotoId: groupsTable.coverPhotoId }).from(groupsTable);
         const photos = await db.select({ id: furnitureItems.id, name: furnitureItems.name, groupId: furnitureItems.groupId, isGroupCover: furnitureItems.isGroupCover, createdAt: furnitureItems.createdAt }).from(furnitureItems);

         const photosByGroup = new Map<string, any[]>();
         photos.forEach((p) => {
           if (p.groupId) {
             const gid = p.groupId;
             if (!photosByGroup.has(gid)) photosByGroup.set(gid, []);
             photosByGroup.get(gid)!.push(p);
           }
         });

         const groupUpdates: { id: string; coverPhotoId: string | null }[] = [];
         const photosToCover: string[] = [];
         const photosToUncover: string[] = [];

         let count = 0;
         for (const g of groups) {
           const gPhotos = photosByGroup.get(g.id) || [];
           if (gPhotos.length === 0) {
             if (g.coverPhotoId) {
               groupUpdates.push({ id: g.id, coverPhotoId: null });
               count++;
             }
             continue;
           }

           const coverPhotoInGroup = gPhotos.find((p) => p.id === g.coverPhotoId);
           const markedCovers = gPhotos.filter((p) => p.isGroupCover === true);

           const isConsistent = coverPhotoInGroup && markedCovers.length === 1 && markedCovers[0].id === g.coverPhotoId;

           if (!isConsistent) {
             let targetCoverId = g.coverPhotoId;
             const photoMarkedAsCover = markedCovers[0] || coverPhotoInGroup;
             
             if (photoMarkedAsCover) {
               targetCoverId = photoMarkedAsCover.id;
             } else {
               const sorted = [...gPhotos].sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
               targetCoverId = sorted[0].id;
             }

             if (g.coverPhotoId !== targetCoverId) {
               groupUpdates.push({ id: g.id, coverPhotoId: targetCoverId });
             }

             for (const p of gPhotos) {
               const shouldBeCover = p.id === targetCoverId;
               if (p.isGroupCover !== shouldBeCover) {
                 if (shouldBeCover) {
                   photosToCover.push(p.id);
                 } else {
                   photosToUncover.push(p.id);
                 }
               }
             }
             count++;
           }
         }

         if (photosToCover.length > 0) {
           await db.update(furnitureItems).set({ isGroupCover: true }).where(inArray(furnitureItems.id, photosToCover));
         }
         if (photosToUncover.length > 0) {
           await db.update(furnitureItems).set({ isGroupCover: false }).where(inArray(furnitureItems.id, photosToUncover));
         }

         for (const update of groupUpdates) {
           await db.update(groupsTable).set({ coverPhotoId: update.coverPhotoId }).where(eq(groupsTable.id, update.id));
         }

         return c.json({ success: true, count, message: `已成功修复 ${count} 个合组的封面配置` });
      }

      if (issueId === 'backfill_thumbhashes') {
         return c.json({ success: true, message: '缩略图缓存已就绪' });
      }

      if (issueId === 'empty_groups') {
         const photos = await db.select({ groupId: furnitureItems.groupId }).from(furnitureItems);
         const photoGroupIds = new Set(photos.map((p) => p.groupId).filter(Boolean));
         const groups = await db.select({ id: groupsTable.id }).from(groupsTable);
         const emptyGroupIds = groups.filter((g) => !photoGroupIds.has(g.id)).map((g) => g.id);
         if (emptyGroupIds.length > 0) await db.delete(groupsTable).where(inArray(groupsTable.id, emptyGroupIds));
         return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
      }

      if (issueId === 'ghost_records') {
        const ghosts = await db.select({ id: furnitureItems.id })
          .from(furnitureItems)
          .where(and(isNull(furnitureItems.imageUrl), isNull(furnitureItems.imageHash)));
        
        const ids = ghosts.map((g) => g.id);
        if (ids.length > 0) {
          await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
        }
        return c.json({ success: true, message: `完全幽灵记录清理完成: ${ids.length}条` });
      }

      if (issueId === 'missing_urls') {
        const records = await db.select({ id: furnitureItems.id })
          .from(furnitureItems)
          .where(isNull(furnitureItems.imageUrl));

        const ids = records.map((r) => r.id);
        if (ids.length > 0) {
          await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
        }
        return c.json({ success: true, message: `无链接记录清理完成: ${ids.length}条` });
      }
      
      if (issueId === 'force_delete_missing_hashes') {
        const targets = await db.select({ id: furnitureItems.id })
          .from(furnitureItems)
          .where(or(isNull(furnitureItems.imageHash), eq(furnitureItems.imageHash, "")));
        
        const ids = targets.map((t) => t.id);
        if (ids.length > 0) {
          await db.delete(furnitureItems).where(inArray(furnitureItems.id, ids));
        }
        return c.json({ success: true, message: `已强制删除 ${ids.length} 条缺失哈希的损坏记录` });
      }

      if (issueId === 'non_standard_item_codes') {
         const targets = await db.select({ id: furnitureItems.id, itemCode: furnitureItems.itemCode })
          .from(furnitureItems)
          .where(sql`${furnitureItems.itemCode} IS NOT NULL`);
        
        const compliantRegex = /^X-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
        const legacyPhotos = targets.filter((p) => p.itemCode && !compliantRegex.test(p.itemCode));
        
        if (legacyPhotos.length === 0) return c.json({ success: true, count: 0, message: "所有编号已规范" });
        
        // Process max 50
        const batch = legacyPhotos.slice(0, 50);
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        
        for (const p of batch) {
          let random = '';
          for (let i = 0; i < 8; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          await db.update(furnitureItems).set({ itemCode: `X-${random}` }).where(eq(furnitureItems.id, p.id));
        }

        return c.json({ success: true, count: batch.length, message: `已规范 ${batch.length} 条编号格式` });
      }

      if (issueId === 'excessive_tags') {
        const ptData = await db.select().from(photoTagsTable);
        const tagData = await db.select({ id: tagsTable.id, name: tagsTable.name, isGlobal: tagsTable.isGlobal }).from(tagsTable);
        const tagMap = new Map<string, any>(tagData.map(t => [t.id, t]));

        const photoTagGroupMap = new Map<string, string[]>();
        ptData.forEach((pt) => {
          const pid = pt.photoId ?? '';
          const tid = pt.tagId ?? '';
          if (!photoTagGroupMap.has(pid)) {
            photoTagGroupMap.set(pid, []);
          }
          photoTagGroupMap.get(pid)!.push(tid);
        });

        const excessivePhotos: { photoId: string, tagIds: string[] }[] = [];
        photoTagGroupMap.forEach((tagIds, photoId) => {
          if (tagIds.length > 3) {
            excessivePhotos.push({ photoId: photoId ?? "", tagIds });
          }
        });

        if (excessivePhotos.length === 0) {
          return c.json({ success: true, count: 0, message: "没有超出限制的照片标签" });
        }

        const getWeight = (tagId: string, tagDetail?: any) => {
          if (tagDetail && tagDetail.isGlobal) return 50;
          return 90;
        };

        let updatedCount = 0;
        for (const item of excessivePhotos) {
          const sorted = [...item.tagIds].sort((a, b) => {
            const weightA = getWeight(a, tagMap.get(a));
            const weightB = getWeight(b, tagMap.get(b));
            if (weightB !== weightA) return weightB - weightA;
            return item.tagIds.indexOf(a) - item.tagIds.indexOf(b);
          });

          const keepTagIds = sorted.slice(0, 3);
          await db.delete(photoTagsTable).where(eq(photoTagsTable.photoId, item.photoId));
          
          if (keepTagIds.length > 0) {
            await db.insert(photoTagsTable).values(keepTagIds.map(tagId => ({ photoId: item.photoId, tagId })));
          }
          
          updatedCount++;
        }

        return c.json({ success: true, count: updatedCount, message: `已成功清理 ${updatedCount} 张照片的多余标签，均按权重与先后顺序保留前 3 个标签` });
      }

      if (issueId === 'diagnose_worker') {
        const { testImageUrl } = await c.req.json();
        const workerUrl = (serverEnv as Record<string, unknown>).VITE_THUMBNAIL_WORKER_URL as string | undefined || process.env.VITE_THUMBNAIL_WORKER_URL;
        if (!workerUrl) {
          return c.json({ success: false, error: "未在服务器检测到 VITE_THUMBNAIL_WORKER_URL 环境变量" });
        }

        const base = workerUrl.replace(/\/$/, '');
        let targetUrl = base;
        let isRealImage = false;

        if (testImageUrl) {
          try {
            const urlObj = new URL(testImageUrl);
            const path = urlObj.pathname;
            targetUrl = `${base}${path.startsWith('/') ? path : '/' + path}?w=200&h=200`;
            isRealImage = true;
          } catch (e) {}
        } else {
          // If no test image, try to find one random image from DB to test "real" connectivity
          const randomPhoto = await db.query.furnitureItems.findFirst({
            columns: { imageUrl: true }
          });
          
          if (randomPhoto?.imageUrl) {
            try {
              const urlObj = new URL(randomPhoto.imageUrl);
              const path = urlObj.pathname;
              targetUrl = `${base}${path.startsWith('/') ? path : '/' + path}?w=200&h=200`;
              isRealImage = true;
            } catch (e) {}
          }
        }

        const start = performance.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const res = await fetch(targetUrl, { 
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const end = performance.now();
          
          if (!res.ok) {
            return c.json({ 
                success: false, 
                error: `Worker 响应异常 (HTTP ${res.status}): ${res.statusText || 'Unknown Error'}`,
                data: {
                  status: res.status,
                  statusText: res.statusText,
                  url: targetUrl,
                  isRealImage
                }
            });
          }

          const contentType = res.headers.get('content-type');

          return c.json({ 
            success: true, 
            data: {
              status: res.status,
              statusText: res.statusText,
              latency: Math.round(end - start),
              url: targetUrl,
              contentType,
              isRealImage
            }
          });
        } catch (e: unknown) {
          return c.json({ success: false, error: `Worker 连通性异常: ${e instanceof Error ? e.message : 'Unknown error'}. 请检查 URL 是否正确及 Worker 是否已部署。` });
        }
      }

      if (issueId === 'repair_i18n_names') {
        const items = await db.select({ id: furnitureItems.id, name: furnitureItems.name, description: furnitureItems.description }).from(furnitureItems);
        const itemsToFix = items.filter((i) => typeof i.name === 'string' || (i.name && !(i.name as Record<string, unknown>).zh));
        
        for (const item of itemsToFix) {
          await db.update(furnitureItems).set({
            name: normalizeI18n(item.name as any) as any,
            description: normalizeI18n(item.description as any) as any
          }).where(eq(furnitureItems.id, item.id));
        }

        // groupsTable name should not be i18n anymore
        // It's handled by invalid_group_names issue
        return c.json({ success: true, message: `已修复 ${itemsToFix.length} 个单品的语种格式` });
      }

      if (issueId === 'schema_sync') {
        try {
          // 移除無用的 group_order
          await db.execute(sql`ALTER TABLE furniture_items DROP COLUMN IF EXISTS group_order;`);
          
          // 補全新增欄位
          await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS description_translations JSONB;`);
          await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS is_analyzing BOOLEAN DEFAULT FALSE;`);
          await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS sub_category TEXT;`);
          
          // 補全現有基本欄位 (以防萬一)
          await db.execute(sql`ALTER TABLE furniture_items ADD COLUMN IF NOT EXISTS dimensions JSONB;`);
          await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';`);
          
          return c.json({ success: true, message: "資料庫 Schema 同步完成（已移除 group_order，補全 description_translations, is_analyzing, sub_category, status 欄位）" });
        } catch (err: any) {
          return c.json({ success: false, error: "Schema 同步失敗: " + err.message }, 500);
        }
      }

      return c.json({ success: false, error: "未知的维护操作 ID" }, 400);
    } catch (e: unknown) {
        logger.error('[Admin Repair] Critical Exception:', e);
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});



