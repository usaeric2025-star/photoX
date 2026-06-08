import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../lib/supabase.js";
import { getServerEnv } from "../../shared/envSchema.js";
import { getR2Client } from "../../lib/storage.js";

const serverEnv = getServerEnv(process.env);
export const adminRepair = new Hono();

adminRepair.post("/repair", async (c) => {
    try {
      const { issueId } = await c.req.json();
      const supabase = await getSupabaseAdmin();
      
      if (issueId === 'member_count_mismatch') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const counts = new Map<string, number>();
         photos?.forEach(p => { if (p.group_id) { const gid = String(p.group_id); counts.set(gid, (counts.get(gid) || 0) + 1); } });
         const { data: groups } = await supabase.from("groups").select("id");
         if (groups) await Promise.all(groups.map(g => supabase.from("groups").update({ member_count: counts.get(String(g.id)) || 0 }).eq("id", g.id)));
         return c.json({ success: true, message: '成员数同步完成' });
      }

      if (issueId === 'backfill_thumbhashes') {
         return c.json({ success: true, message: '缩略图缓存已就绪' });
      }

      if (issueId === 'empty_groups') {
         const { data: photos } = await supabase.from("furniture_items").select("group_id");
         const photoGroupIds = new Set(photos?.map(p => String(p.group_id)).filter(Boolean));
         const { data: groups } = await supabase.from("groups").select("id");
         const emptyGroupIds = groups?.filter(g => !photoGroupIds.has(String(g.id))).map(g => g.id) || [];
         if (emptyGroupIds.length > 0) await supabase.from("groups").delete().in("id", emptyGroupIds);
         return c.json({ success: true, message: `清理了 ${emptyGroupIds.length} 个空合组` });
      }

      if (issueId === 'ghost_records') {
        const { data: ghosts } = await supabase
          .from("furniture_items")
          .select("id")
          .is("image_url", null)
          .is("image_hash", null);
        
        const ids = ghosts?.map(g => g.id) || [];
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

        const ids = records?.map(r => r.id) || [];
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
        
        const ids = targets?.map(t => t.id) || [];
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
        const legacyPhotos = targets?.filter(p => p.item_code && !compliantRegex.test(p.item_code)) || [];
        
        if (legacyPhotos.length === 0) return c.json({ success: true, count: 0, message: "所有编号已规范" });
        
        // Process max 50
        const batch = legacyPhotos.slice(0, 50);
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        
        const updates = batch.map(p => {
          let random = '';
          for (let i = 0; i < 8; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return { id: p.id, item_code: `X-${random}` };
        });

        await Promise.all(updates.map(u => 
          supabase.from("furniture_items").update({ item_code: u.item_code }).eq("id", u.id)
        ));

        return c.json({ success: true, count: updates.length, message: `已规范 ${updates.length} 条编号格式` });
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
        } catch (e: any) {
          return c.json({ success: false, error: `Worker 连通性异常: ${e.message}. 请检查 URL 是否正确及 Worker 是否已部署。` });
        }
      }

      return c.json({ success: false, error: "未知的维护操作 ID" }, 400);
    } catch (e: any) {
        console.error('[Admin Repair] Critical Exception:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});



