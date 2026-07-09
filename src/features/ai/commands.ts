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
    const res = await api.ai['analyze-base64'].$post({
        json: {
            promptText: "TEST",
            base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAAAgAB35oT2AAAAABJRU5ErkJggg==",
            provider
        }
    });

    if (!res.ok) {
        return { success: false, error: 'Connection failed' };
    }
    const body: { success: boolean; error?: string } = await (res as unknown as Response).json();
    if (body.success) {
        return { success: true };
    }
    return { success: false, error: body.error || 'Failed' };
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
  
  const response = await api.ai['analyze-photo-v2'].$post({
    json: { photoDetail, photoId: photo.id }
  });

  if (!response.ok) {
    const error = await response.json() as { error?: string };
    throw ErrorFactory.fatal(error.error || 'AI 单张识别分析失败', { context: 'analyzeSinglePhoto' });
  }

  const resData = await response.json() as { data: Record<string, unknown> | string };
  let parsed = resData.data;
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
  try {
      const resp = await api.ai.analyze.$post({ json: { photoId } });
      if (!resp.ok) {
        let errorMsg = 'AI 服务响应异常';
        try {
          const errorData = await resp.json() as { error?: { message?: string } | string };
          errorMsg = (typeof errorData.error === 'object' ? errorData.error?.message : errorData.error) || errorMsg;
        } catch (je) {
          const text = await resp.text();
          errorMsg = `[HTTP ${resp.status}] ${text.substring(0, 100)}`;
        }
        throw ErrorFactory.fatal(errorMsg, { context: 'analyzePhoto' });
      }
      
      const data = await resp.json();
     if (data.success) {
       let parsed = data.data;
       if (Array.isArray(parsed)) {
         parsed = parsed[0] || {};
       }
       
       // 📌 使用業界標準 Adapter 正規化資料
       const adapter = PhotoAIAdapterRegistry.getAdapter('gemini');
       const normalized = adapter.normalize(parsed, (data as any).raw_result || JSON.stringify(parsed));

       // 清理名稱，移除 .jpg, .png 等後綴
       let cleanName = normalized.name || '';
       cleanName = cleanName.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();

       return {
         name: cleanName,
         description: normalized.description, // 傳遞完整多語系物件 { zh, en, ms }
         category_id: normalized.categoryId,
         group_id: normalized.groupId,
         tagNames: normalized.tagNames,
         tagIds: Array.isArray(parsed.tag_ids) ? parsed.tag_ids.map(String) : [],
         dimensions: normalized.dimensions,
         raw_result: normalized.rawResult
       };
     } else {
       let errorMsg = (data as { error?: string }).error || 'AI 分析失敗';
       if (typeof errorMsg === 'string' && errorMsg.startsWith('{')) {
          try {
             const parsed = JSON.parse(errorMsg);
             if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) {
                errorMsg = parsed.error.message;
             } else if (typeof parsed.error === 'string') {
                errorMsg = parsed.error;
             }
          } catch (e) {
             // ignore
          }
       }
       throw ErrorFactory.fatal(errorMsg, { context: 'analyzePhoto' });
     }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw ErrorFactory.fatal('请求已取消', { context: 'analyzePhoto' });
    throw ErrorFactory.fatal((e as Error).message || 'AI 分析异常', { context: 'analyzePhoto' });
  }
};
