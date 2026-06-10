import { api } from '@/lib/api';
import { Photo } from '../../types';

import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { ok, err, ErrorFactory } from '@/lib/error/ErrorFactory';
import { type AppResult } from '@/types/api';

/**
 * [V2.0-SERVICE-SINGLETON] AI Photo Analysis Service
 */
export const testAiConnection = async (apiKey: string, provider: string, customModel?: string) => {
  try {
    const res = await api.ai['analyze-base64'].$post({
        json: {
            promptText: "TEST",
            base64Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAAAgAB35oT2AAAAABJRU5ErkJggg==",
            customModel: customModel || 'gemini-2.5-flash-lite'
        }
    }) as any;
    const body = await res.json();
    if (body.success) {
        return { success: true };
    }
    return { success: false, error: body.error || 'Failed' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
};

function formatField(field: any): string {
  if (!field) return '';
  if (typeof field === 'object') {
    return field.zh || field.en || field.ms || '';
  }
  return String(field);
}

export async function analyzeGroup(photos: Photo[]): Promise<any> {
  const photoDetails = photos.map(p => {
    const nameStr = formatField(p.name);
    const descStr = formatField(p.description);
    const tagNames = (p.tags || []).map(t => t.name).join(',');
    return `- 名称: ${nameStr}, 标签: ${tagNames || '无'}, 描述: ${descStr || '无'}`;
  }).join('\n');
  
  const response = await api.ai['analyze-group'].$post({
    json: { photoDetails }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw ErrorFactory.wrap(new Error(error.error || 'AI 智能合组分析失败'), 'analyzeGroup');
  }

  const resData = await response.json() as any;
  let parsed = resData.data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      console.warn("Failed to parse group analysis JSON:", parsed);
      throw new Error("Invalid format returned by AI for group.");
    }
  }
  return parsed as any;
}

export async function analyzeSinglePhotoDetail(photo: Photo): Promise<any> {
  const nameStr = formatField(photo.name);
  const descStr = formatField(photo.description);
  const tagNames = (photo.tags || []).map(t => t.name).join(',');
  const photoDetail = `- 名称: ${nameStr}\n- 现有分类: ${photo.categoryName}\n- 现有标签: ${tagNames || '无'}\n- 描述: ${descStr || '无'}`;
  
  const response = await api.ai['analyze-photo-v2'].$post({
    json: { photoDetail }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw ErrorFactory.wrap(new Error(error.error || 'AI 单张识别分析失败'), 'analyzeSinglePhoto', photo.id);
  }

  const resData = await response.json() as any;
  let parsed = resData.data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      console.warn("Failed to parse single photo analysis JSON:", parsed);
      throw new Error("Invalid format returned by AI for photo.");
    }
  }
  return parsed as any;
}

export const analyzePhoto = async (photoId: string, signal?: AbortSignal): Promise<AppResult<any>> => {
  try {
     const resp = await api.ai.analyze.$post({ json: { photoId } }) as any;
     const data = await resp.json();
     if (data.success) {
       const parsed = data.data;
       return ok({
          name: parsed.name || '',
          description: parsed.description || '',
          category_id: parsed.category_id || null,
          tagNames: (parsed.new_tags || parsed.tags || []),
          tagIds: Array.isArray(parsed.tag_ids) ? parsed.tag_ids.map(String) : [],
          raw_result: JSON.stringify(parsed)
       });
     } else {
       let errorMsg = data.error || 'AI 分析失败';
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
       return err(errorMsg);
     }
  } catch (e: any) {
    if (e.name === 'AbortError') return err('请求已取消');
    return err(e.message || 'AI 分析异常', 'UNKNOWN');
  }
};
