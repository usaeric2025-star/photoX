import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';

import { previewExcessiveTags, repairExcessiveTags } from './repairs/excessive_tags.js';
import { repairGroupCoverMismatch } from './repairs/group_cover_mismatch.js';
import { diagnoseWorker } from './repairs/diagnose_worker.js';
import {
  repairMissingUrls,
  repairGhostRecords,
  forceDeleteMissingHashes,
  repairEmptyGroups,
  repairNonStandardItemCodes,
  repairI18nNames,
  schemaSync,
  rebuildViews
} from './repairs/db_repairs.js';

export const adminRepair = new Hono();

adminRepair.post("/preview", async (c) => {
    try {
      const { issueId } = await c.req.json();

      if (issueId === 'excessive_tags') {
        return previewExcessiveTags(c);
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

      const repairMap: Record<string, (c: any) => Promise<Response>> = {
        group_cover_mismatch: repairGroupCoverMismatch,
        backfill_thumbhashes: async (c) => c.json({ success: true, message: '缩略图缓存已就绪' }),
        empty_groups: repairEmptyGroups,
        ghost_records: repairGhostRecords,
        rebuild_views: rebuildViews,
        missing_urls: repairMissingUrls,
        force_delete_missing_hashes: forceDeleteMissingHashes,
        non_standard_item_codes: repairNonStandardItemCodes,
        excessive_tags: repairExcessiveTags,
        diagnose_worker: diagnoseWorker,
        repair_i18n_names: repairI18nNames,
        schema_sync: schemaSync,
      };

      if (repairMap[issueId]) {
        return await repairMap[issueId](c);
      }

      return c.json({ success: false, error: "未知的维护操作 ID" }, 400);
    } catch (e: unknown) {
        logger.error('[Admin Repair] Critical Exception:', e);
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});



