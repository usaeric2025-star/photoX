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
