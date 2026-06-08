import { analyzePhoto } from './analysisService';
import { translateFields } from './translationService';
import { updatePhoto } from '../photo/commands';
import { syncPhotoTags } from '../tag/commands';
import { ok, fail } from '@/lib/utils/result';
import type { AppResult } from '@/lib/types/result';

/**
 * AI 分析並保存照片（含翻譯與標籤同步）
 */
export const analyzeAndSavePhoto = async (
  photo: any, 
  settingsData: any, 
  tags: any[], 
  categories: any[]
): Promise<AppResult<any>> => {
  // 1. AI 分析 (Model A)
  const analysis = await analyzePhoto(
      photo.image_url, 
      categories, 
      tags, 
      settingsData.custom_model || 'gemini-1.5-flash', 
      settingsData.gemini_api_key
  );
  if (!analysis.success) return analysis;

  // 2. 補全翻譯 (Model B: Agnes)
  const translation = await translateFields(analysis.data.name, analysis.data.description);
  if (!translation.success) return translation;

  // 3. 保存照片基礎信息
  const updateResult = await updatePhoto(photo.id, {
    name: {
      zh: analysis.data.name,
      en: translation.data.name.en,
      ms: translation.data.name.ms
    },
    description: {
      zh: analysis.data.description,
      en: translation.data.description.en,
      ms: translation.data.description.ms
    },
    category_id: analysis.data.category_id
  });
  if (!updateResult.success) return updateResult;

  // 4. 標籤寫入
  if (analysis.data.tagNames.length > 0) {
    const tagResult = await syncPhotoTags(photo.id, analysis.data.tagNames);
    if (!tagResult.success) {
      console.error(`[AI] 標籤同步失敗: ${photo.id}`, tagResult.error);
    }
  }

  return updateResult;
};
