import { api } from '#lib/api.js';
import { Photo } from '#src/types/index.js';
import { PhotoAIAdapterRegistry } from './types.js';

import { supabase } from '#lib/supabase.js';
import { DB_CONFIG } from '#src/constants/config.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { MAX_TAGS_PER_PHOTO } from '#src/constants/limits.js';

/**
 * [V2.0-SERVICE-SINGLETON] AI Photo Analysis Service
 */
export const testAiConnection = async (apiKey: string, provider: string) => {
  try {
    await ErrorFactory.unwrap<{ success: boolean }>(
      api.ai['analyze-base64'].$post({
        json: {
          promptText: "TEST",
          base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAAAgAB35oT2AAAAABJRU5ErkJggg==",
          provider
        }
      }),
      'Connection failed'
    );
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
};

function formatField(field: Record<string, unknown> | string | number | null | undefined): string {
  if (!field) return '';
  if (typeof field === 'object') {
    const obj = field as Record<string, unknown>;
    return String(obj.zh || obj.en || obj.ms || '');
  }
  return String(field);
}


export async function analyzeSinglePhotoDetail(photo: Photo): Promise<Record<string, unknown>> {
  const nameStr = formatField(photo.name);
  const descStr = formatField(photo.description);
  const tagNames = (photo.tags || []).map(t => t.name).join(',');
  const photoDetail = `- 名称: ${nameStr}\n- 现有分类: ${photo.category}\n- 现有标签: ${tagNames || '无'}\n- 描述: ${descStr || '无'}`;
  
  const resData = await ErrorFactory.unwrap<Record<string, unknown> | string>(
    api.ai['analyze-photo-v2'].$post({
      json: { photoDetail, photoId: photo.id }
    }),
    'AI 单张识别分析失败'
  );
  let parsed = resData;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      throw ErrorFactory.fatal('Json Parse error', { context: 'analyzeSinglePhoto' });
    }
  }
  return parsed as Record<string, unknown>;
}

export const analyzePhoto = async (photoId: string, signal?: AbortSignal): Promise<unknown> => {
  const maxRetries = 2;
  let lastError: unknown = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const data = await ErrorFactory.unwrap<Record<string, any>>(
        api.ai.analyze.$post({ json: { photoId } }, { init: { signal } }),
        'AI 服務響應異常'
      );
      
      let parsed = data;
      if (Array.isArray(parsed)) {
        parsed = parsed[0] || {};
      }
      
      const adapter = PhotoAIAdapterRegistry.getAdapter('gemini');
      const normalized = adapter.normalize(parsed, data.raw_result || JSON.stringify(parsed));

      let cleanName = normalized.name || '';
      cleanName = cleanName.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();

      return {
        name: cleanName,
        description: normalized.description,
        category_id: normalized.categoryId,
        group_id: normalized.groupId,
        tagNames: normalized.tagNames,
        tagIds: Array.isArray(parsed.tag_ids) ? parsed.tag_ids.map(String) : [],
        dimensions: normalized.dimensions,
        raw_result: normalized.rawResult
      };
    } catch (e: any) {
      lastError = e;
      if (e.name === 'AbortError') throw ErrorFactory.fatal('请求已取消', { context: 'analyzePhoto' });
      
      // If it's a 404/504 or common transient error, retry
      const statusCode = e.statusCode || (e.response && e.response.status);
      const isTransient = statusCode === 404 || statusCode === 504 || statusCode === 502 || statusCode === 503 || e.message?.includes('timeout') || e.message?.includes('NOT_FOUND');
      
      if (isTransient && i < maxRetries) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`[analyzePhoto] Attempt ${i + 1} failed with ${e.message}, retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      break;
    }
  }

  throw ErrorFactory.fatal((lastError as Error).message || 'AI 分析异常', { 
    context: 'analyzePhoto',
    originalError: lastError
  });
};
