import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase.js";
import { getServerEnv } from "../../_shared/envSchema.js";
import { getR2Client } from "../../_lib/storage.js";
import { normalizeI18n } from "../../_shared/i18n.js";

const serverEnv = getServerEnv(process.env);
export const adminRepair = new Hono();

adminRepair.post("/preview", async (c) => {
    try {
      const { issueId } = await c.req.json();
      const supabase = await getSupabaseAdmin();

      if (issueId === 'excessive_tags') {
        const { data: ptData, error: fetchErr } = await supabase.from('photo_tags').select('photo_id, tag_id');
        if (fetchErr) throw fetchErr;

        const { data: pData, error: pErr } = await supabase.from('furniture_items').select('id, name');
        if (pErr) throw pErr;
        const photoMap = new Map<string, Record<string, unknown>>((pData || []).map((p: Record<string, unknown>) => [String(p.id), p]));

        const { data: tagData, error: tagErr } = await supabase.from('tags').select('id, name, is_global');
        if (tagErr) throw tagErr;
        const tagMap = new Map<string, Record<string, unknown>>((tagData || []).map((t: Record<string, unknown>) => [String(t.id), t]));

        const photoTagMap = new Map<string, string[]>();
        ptData?.forEach((pt: Record<string, unknown>) => {
          if (pt.photo_id) {
            const pid = String(pt.photo_id);
            if (!photoTagMap.has(pid)) {
              photoTagMap.set(pid, []);
            }
            photoTagMap.get(pid)!.push(String(pt.tag_id));
          }
        });

        const affectedPhotos: Array<{ photoId: string, photoName: string, keptTags: (string | number)[], removedTags: (string | number)[] }> = [];
        const getWeight = (tagId: string, tagDetail?: Record<string, unknown>) => {
          if (tagDetail && tagDetail.is_global) return 50;
          return 90;
        };

        photoTagMap.forEach((tagIds, photoId) => {
          if (tagIds.length > 3) {
            const photoItem = photoMap.get(photoId);
            const photoName = photoItem ? (normalizeI18n(photoItem.name) || "未命名产品") : "未知照片";

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
      const supabase = await getSupabaseAdmin();
      
      if (issueId === 'missing_secrets_table') {
          return c.json({ 
              success: false, 
              error: "Schema 限制：自動修復無法直接創建物理表。請前往 Supabase 儀表盤 -> SQL Editor，運行以下代碼：\n\nCREATE TABLE secrets (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());\nALTER TABLE secrets ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"Allow read for all\" ON secrets FOR SELECT USING (true);\nCREATE POLICY \"Allow write for admin\" ON secrets FOR ALL USING (true);" 
          }, 400);
      }

      if (issueId === 'group_cover_mismatch') {
         const { data: groups } = await supabase.from("groups").select("id, name, cover_photo_id");
         const { data: photos } = await supabase.from("furniture_items").select("id, name, group_id, is_group_cover, created_at");

         const photosByGroup = new Map<string, Record<string, unknown>[]>();
         photos?.forEach((p: Record<string, unknown>) => {
           if (p.group_id) {
             const gid = String(p.group_id);
             if (!photosByGroup.has(gid)) photosByGroup.set(gid, []);
             photosByGroup.get(gid)!.push(p);
           }
         });

         const groupUpdates: { id: string; cover_photo_id: string | null }[] = [];
         const photosToCover: string[] = [];
         const photosToUncover: string[] = [];

         let count = 0;
         for (const g of groups || []) {
           const gPhotos = photosByGroup.get(String(g.id)) || [];
           if (gPhotos.length === 0) {
             if (g.cover_photo_id) {
               groupUpdates.push({ id: String(g.id), cover_photo_id: null });
               count++;
             }
             continue;
           }

           const validCover = gPhotos.some((p) => String(p.id) === String(g.cover_photo_id));
           const markedCover = gPhotos.some((p) => p.is_group_cover === true);

           if (!g.cover_photo_id || !validCover || !markedCover) {
             let targetCoverId = g.cover_photo_id;
             const photoMarkedAsCover = gPhotos.find((p) => p.is_group_cover === true);
             
             if (photoMarkedAsCover) {
               targetCoverId = String(photoMarkedAsCover.id);
             } else {
               const sorted = [...gPhotos].sort((a, b) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime());
               targetCoverId = String(sorted[0].id);
             }

             if (String(g.cover_photo_id) !== targetCoverId) {
               groupUpdates.push({ id: String(g.id), cover_photo_id: targetCoverId });
             }

             for (const p of gPhotos) {
               const shouldBeCover = String(p.id) === targetCoverId;
               if (p.is_group_cover !== shouldBeCover) {
                 if (shouldBeCover) {
                   photosToCover.push(String(p.id));
                 } else {
                   photosToUncover.push(String(p.id));
                 }
               }
             }
             count++;
           }
         }

         const dbPromises: Promise<unknown>[] = [];

         if (photosToCover.length > 0) {
           dbPromises.push(
             supabase.from("furniture_items").update({ is_group_cover: true }).in("id", photosToCover).then(({ error }: { error: unknown }) => { if (error) throw error; })
           );
         }
         if (photosToUncover.length > 0) {
           dbPromises.push(
             supabase.from("furniture_items").update({ is_group_cover: false }).in("id", photosToUncover).then(({ error }: { error: unknown }) => { if (error) throw error; })
           );
         }

         for (const update of groupUpdates) {
           dbPromises.push(
             supabase.from("groups").update({ cover_photo_id: update.cover_photo_id }).eq("id", update.id).then(({ error }: { error: unknown }) => { if (error) throw error; })
           );
         }

         if (dbPromises.length > 0) {
           await Promise.all(dbPromises);
         }

         return c.json({ success: true, count, message: `已成功修复 ${count} 个合组的封面配置` });
      }

      if (issueId === 'backfill_thumbhashes') {
         return c.json({ success: true, message: '缩略图缓存已就绪' });
      }

      if (issueId === 'empty_groups') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const photoGroupIds = new Set(photos?.map((p: Record<string, unknown>) => String(p.group_id)).filter(Boolean));
         const { data: groups } = await supabase.from("groups").select("id");
         const emptyGroupIds = groups?.filter((g: Record<string, unknown>) => !photoGroupIds.has(String(g.id))).map((g: Record<string, unknown>) => g.id) || [];
         if (emptyGroupIds.length > 0) await supabase.from("groups").delete().in("id", emptyGroupIds);
         return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
      }

      if (issueId === 'ghost_records') {
        const { data: ghosts } = await supabase
          .from("furniture_items")
          .select("id")
          .is("image_url", null)
          .is("image_hash", null);
        
        const ids = ghosts?.map((g: Record<string, unknown>) => g.id) || [];
        if (ids.length > 0) {
          const { error } = await supabase.from("furniture_items").delete().in("id", ids);
          if (error) throw error;
        }
        return c.json({ success: true, message: `完全幽灵记录清理完成: ${ids.length}条` });
      }

      if (issueId === 'missing_urls') {
        const { data: records } = await supabase
          .from("furniture_items")
          .select("id")
          .is("image_url", null);

        const ids = records?.map((r: Record<string, unknown>) => r.id) || [];
        if (ids.length > 0) {
          const { error } = await supabase.from("furniture_items").delete().in("id", ids);
          if (error) throw error;
        }
        return c.json({ success: true, message: `无链接记录清理完成: ${ids.length}条` });
      }
      
      if (issueId === 'force_delete_missing_hashes') {
        const { data: targets } = await supabase
          .from("furniture_items")
          .select("id")
          .or('image_hash.is.null,image_hash.eq.""');
        
        const ids = targets?.map((t: Record<string, unknown>) => t.id) || [];
        if (ids.length > 0) {
          const { error } = await supabase.from("furniture_items").delete().in("id", ids);
          if (error) throw error;
        }
        return c.json({ success: true, message: `已强制删除 ${ids.length} 条缺失哈希的损坏记录` });
      }

      if (issueId === 'non_standard_item_codes') {
         const { data: targets, error: fetchError } = await supabase
          .from("furniture_items")
          .select("id, item_code")
          .not("item_code", "is", null);

        if (fetchError) throw fetchError;
        
        const compliantRegex = /^X-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
        const legacyPhotos = targets?.filter((p: { item_code?: string | null }) => p.item_code && !compliantRegex.test(p.item_code)) || [];
        
        if (legacyPhotos.length === 0) return c.json({ success: true, count: 0, message: "所有编号已规范" });
        
        // Process max 50
        const batch = legacyPhotos.slice(0, 50);
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        
        const updates = batch.map((p: { id: string }) => {
          let random = '';
          for (let i = 0; i < 8; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return { id: p.id, item_code: `X-${random}` };
        });

        await Promise.all(updates.map((u: { id: string, item_code: string }) => 
          supabase.from("furniture_items").update({ item_code: u.item_code }).eq("id", u.id)
        ));

        return c.json({ success: true, count: updates.length, message: `已规范 ${updates.length} 条编号格式` });
      }

      if (issueId === 'excessive_tags') {
        const { data: ptData, error: fetchErr } = await supabase.from('photo_tags').select('photo_id, tag_id');
        if (fetchErr) throw fetchErr;

         const { data: tagData, error: tagErr } = await supabase.from('tags').select('id, name, is_global');
        if (tagErr) throw tagErr;
        const tagMap = new Map<string, Record<string, unknown>>((tagData || []).map((t: Record<string, unknown>) => [String(t.id), t]));

        const photoTagMap = new Map<string, string[]>();
        ptData?.forEach((pt: Record<string, unknown>) => {
          if (pt.photo_id) {
            const pid = String(pt.photo_id);
            if (!photoTagMap.has(pid)) {
              photoTagMap.set(pid, []);
            }
            photoTagMap.get(pid)!.push(String(pt.tag_id));
          }
        });

        const excessivePhotos: { photoId: string, tagIds: string[] }[] = [];
        photoTagMap.forEach((tagIds, photoId) => {
          if (tagIds.length > 3) {
            excessivePhotos.push({ photoId, tagIds });
          }
        });

        if (excessivePhotos.length === 0) {
          return c.json({ success: true, count: 0, message: "没有超出限制的照片标签" });
        }

        const getWeight = (tagId: string, tagDetail?: Record<string, unknown>) => {
          if (tagDetail && tagDetail.is_global) return 50;
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
          const { error: delErr } = await supabase.from('photo_tags').delete().eq('photo_id', item.photoId);
          if (delErr) throw delErr;
          
          const associations = keepTagIds.map((tagId) => ({ photo_id: item.photoId, tag_id: tagId }));
          const { error: insErr } = await supabase.from('photo_tags').insert(associations);
          if (insErr) throw insErr;
          
          updatedCount++;
        }

        return c.json({ success: true, count: updatedCount, message: `已成功清理 ${updatedCount} 张照片的多余标签，均按权重与先后顺序保留前 3 个标签` });
      }

      if (issueId === 'diagnose_worker') {
        const { testImageUrl } = await c.req.json();
        const workerUrl = (serverEnv as any).VITE_THUMBNAIL_WORKER_URL || process.env.VITE_THUMBNAIL_WORKER_URL;
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
          const { data: randomPhoto } = await supabase
            .from('furniture_items')
            .select('image_url')
            .limit(1)
            .single();
          
          if (randomPhoto?.image_url) {
            try {
              const urlObj = new URL(randomPhoto.image_url);
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
        // Fix furniture_items
        const { data: items } = await supabase.from("furniture_items").select("id, name, description");
        const itemsToFix = items?.filter((i: Record<string, unknown>) => typeof i.name === 'string' || (i.name && !(i.name as Record<string, unknown>).zh)) || [];
        
        for (const item of itemsToFix) {
          await supabase.from("furniture_items").update({
            name: normalizeI18n(item.name),
            description: normalizeI18n(item.description)
          }).eq("id", item.id);
        }

        // Fix groups
        const { data: groups } = await supabase.from("groups").select("id, name");
        const groupsToFix = groups?.filter((g: Record<string, unknown>) => typeof g.name === 'string' || (g.name && !(g.name as Record<string, unknown>).zh)) || [];

        for (const group of groupsToFix) {
          await supabase.from("groups").update({
            name: normalizeI18n(group.name),
            description: normalizeI18n(group.description)
          }).eq("id", group.id);
        }

        return c.json({ success: true, message: `已修复 ${itemsToFix.length} 个单品和 ${groupsToFix.length} 个合组的语种格式` });
      }

      return c.json({ success: false, error: "未知的维护操作 ID" }, 400);
    } catch (e: unknown) {
        logger.error('[Admin Repair] Critical Exception:', e);
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});



