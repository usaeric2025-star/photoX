import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Photo, Tag, Category } from '#src/types/index.js';
import { cleanTranslationPrefixes } from '#src/features/ai/safeText.js';
import { resolveTagNamesToIds } from '#src/features/ai/tagCompletion.js';

export interface AIBatchParams {
  ids: string[];
  prompt?: string;
  context?: string;
}

/**
 * AIService
 * 
 * 處理與 AI 識別與批處理相關的核心邏輯。
 * 設計為靜態 Service 類，便於未來擴展（如流式傳輸、多模態支持）。
 */
export class AIService {
  /**
   * 獲取單張照片的 AI 識別結果
   */
  static async analyze(photo: Photo): Promise<Record<string, unknown>> {
    const res = await api.ai.analyze.$post({
      json: { 
        photoId: photo.id, 
        imageUrl: photo.thumbnailUrl || photo.imageUrl 
      }
    });
    return ErrorFactory.unwrap(res, 'AI Analysis Failed');
  }

  /**
   * 批處理分析
   */
  static async analyzeBatch(params: AIBatchParams) {
    // @ts-ignore - Hono client indexing
    const res = await api.ai['analyze'].$post({
      json: params
    });
    return ErrorFactory.unwrap<any>(res, 'AI Batch Analysis Failed');
  }

  /**
   * 重新提取（不重新調用 AI，僅解析緩存）
   */
  static async reExtract(photoId: string): Promise<Record<string, unknown>> {
    // @ts-ignore
    const res = await api.admin.photos["photo-ai-reextract"].$post({
      json: { photoId }
    });
    return ErrorFactory.unwrap(res, 'AI Re-extraction Failed');
  }

  /**
   * 將 AI 建議的標籤名稱轉換為系統 ID
   */
  static async resolveTagNames(tagNames: string[], allTags: Tag[]): Promise<Tag[]> {
    if (!tagNames.length) return [];
    const ids = await resolveTagNamesToIds(tagNames, allTags);
    const latestTags = await ErrorFactory.unwrap<Tag[]>(api.tags.$get(), 'Fetch tags failed').catch(() => allTags);
    return ids.map(id => latestTags.find(t => String(t.id) === String(id))).filter(Boolean) as Tag[];
  }

  /**
   * 解析 AI 原始結果並轉換為更新 Payload
   */
  static async parseToUpdates(result: any, allTags: Tag[], categories: Category[]): Promise<Record<string, unknown>> {
    const updates: Record<string, unknown> = {};
    
    // 1. Name
    if (result.name) {
      let cleanName = '';
      if (typeof result.name === 'object' && result.name !== null) {
        const n = result.name as Record<string, string>;
        cleanName = n.zh || n.en || n.ms || String(result.name);
      } else {
        cleanName = String(result.name);
      }
      updates.name = cleanName.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();
    }

    // 2. Group
    const rawGroup = result.groupId || result.group_id;
    if (rawGroup) {
      let targetGroupId: string | null = null;
      if (typeof rawGroup === 'string' && rawGroup.trim().length > 0 && rawGroup !== 'null' && rawGroup !== 'undefined') {
        targetGroupId = rawGroup.trim();
      } else if (typeof rawGroup === 'object' && rawGroup !== null) {
        const gObj = rawGroup as Record<string, unknown>;
        targetGroupId = String(gObj.id || gObj.groupId || gObj.group_id || '');
      }
      if (targetGroupId && targetGroupId !== 'undefined' && targetGroupId !== 'null') {
        updates.groupId = targetGroupId;
      }
    }

    // 3. Category
    const rawCatId = result.category_id || result.categoryId || '';
    const rawCatName = String(result.category_name || result.categoryName || '');
    let matchedId: number | null = null;
    
    if (rawCatId && categories.find(c => String(c.id) === String(rawCatId))) {
      matchedId = Number(rawCatId);
    } else if (rawCatName) {
      const found = categories.find(c => c.name.toLowerCase() === rawCatName.toLowerCase());
      if (found) matchedId = Number(found.id);
    }
    if (matchedId) updates.categoryId = matchedId;

    // 4. Tags
    const sourceTags = Array.isArray(result.tagNames) ? result.tagNames : (Array.isArray(result.tag_names) ? result.tag_names : []);
    const sourceTagIds = Array.isArray(result.tagIds) ? result.tagIds : (Array.isArray(result.tag_ids) ? result.tag_ids : []);
    const rawNames: string[] = sourceTags.map((t: any) => (typeof t === 'object' ? String(t?.name || '') : String(t))).filter(Boolean);
    const parsedTagIds: string[] = sourceTagIds.map((t: any) => (typeof t === 'object' ? String(t?.id || t?.tagId || '') : String(t))).filter(Boolean);
    
    const finalTagIds = new Set<number>();
    const unresolvedNames: string[] = [];

    [...parsedTagIds, ...rawNames].forEach((idOrName: string) => {
      const found = allTags.find(t => String(t.id) === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
      if (found) finalTagIds.add(Number(found.id));
      else unresolvedNames.push(idOrName);
    });

    updates.unresolvedTagNames = unresolvedNames;
    updates.resolvedTagIds = Array.from(finalTagIds);

    // 5. Description
    if (result.description) {
      if (typeof result.description === 'object' && result.description !== null) {
        updates.description = {
          zh: result.description.zh || '',
          en: result.description.en || '',
          ms: result.description.ms || ''
        };
      } else {
        updates.description = { zh: String(result.description), en: '', ms: '' };
      }
    }

    // 6. Dimensions
    if (Array.isArray(result.dimensions)) {
      updates.dimensions = result.dimensions;
    }

    if (result.itemCode || result.item_code) {
      updates.itemCode = String(result.itemCode || result.item_code);
    }

    return updates;
  }

  /**
   * 格式化 AI 建議（單純視覺展示用）
   */
  static formatAiSuggestions(raw: any) {
    return {
      name: cleanTranslationPrefixes(raw.name || '').trim(),
      description: {
        zh: cleanTranslationPrefixes(raw.description?.zh || raw.description || '').trim(),
        en: cleanTranslationPrefixes(raw.description?.en || '').trim(),
        ms: cleanTranslationPrefixes(raw.description?.ms || '').trim(),
      },
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      category: raw.category || null,
      manufacturer: raw.manufacturer || null,
    };
  }
}
