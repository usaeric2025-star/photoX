import { logger } from '@/lib/logger';
import { api } from '@/lib/api';
import { Photo } from '../../types';

import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

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
    throw ErrorFactory.fatal(error.error || 'AI 智能合组分析失败', { context: 'analyzeGroup' });
  }

  const resData = await response.json() as any;
  let parsed = resData.data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      logger.warn("Failed to parse group analysis JSON:", parsed);
      throw ErrorFactory.fatal('Json Parse error', { context: 'analyzeGroup' });
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
    json: { photoDetail, photoId: photo.id }
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw ErrorFactory.fatal(error.error || 'AI 单张识别分析失败', { context: 'analyzeSinglePhoto' });
  }

  const resData = await response.json() as any;
  let parsed = resData.data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      logger.warn("Failed to parse single photo analysis JSON:", parsed);
      throw ErrorFactory.fatal('Json Parse error', { context: 'analyzeSinglePhoto' });
    }
  }
  return parsed as any;
}

export const analyzePhoto = async (photoId: string, signal?: AbortSignal): Promise<unknown> => {
  try {
     const resp = await api.ai.analyze.$post({ json: { photoId } }) as any;
     const data = await resp.json();
     if (data.success) {
       let parsed = data.data;
       if (Array.isArray(parsed)) {
         parsed = parsed[0] || {};
       }
       
       const rawTags = (parsed.tag_names || parsed.new_tags || parsed.tags || []);
       let sanitizedTagNames = Array.isArray(rawTags)
         ? rawTags.map((t: any) => {
             if (!t) return '';
             if (typeof t === 'object') return String(t.name || t.zh || t.en || '');
             return String(t);
           }).filter(Boolean)
         : [];

       const tagCount = sanitizedTagNames.length;
       if (tagCount > 3) {
         sanitizedTagNames = sanitizedTagNames.slice(0, 3);
       }

       const safeTrim = (val: any): any => {
          if (!val) return '';
          if (typeof val === 'string') return val.trim();
          if (typeof val === 'object') {
            const res: any = {};
            for (const k in val) {
              if (Object.prototype.hasOwnProperty.call(val, k)) {
                res[k] = typeof val[k] === 'string' ? val[k].trim() : val[k];
              }
            }
            return res;
          }
          return String(val).trim();
        };

        return {
           name: safeTrim(parsed.name),
           description: safeTrim(parsed.description),
          category_id: parsed.category_id || null,
          group_id: parsed.group_id || null,
          tagNames: sanitizedTagNames,
          tagIds: Array.isArray(parsed.tag_ids) ? parsed.tag_ids.map(String) : [],
          raw_result: data.raw_result || JSON.stringify(data.data)
       };
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
       throw ErrorFactory.fatal(errorMsg, { context: 'analyzePhoto' });
     }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw ErrorFactory.fatal('请求已取消', { context: 'analyzePhoto' });
    throw ErrorFactory.fatal((e as Error).message || 'AI 分析异常', { context: 'analyzePhoto' });
  }
};
