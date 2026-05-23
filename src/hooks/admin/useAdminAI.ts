import { useCallback, useMemo, useState } from 'react';
import { User, Photo, Manufacturer, Category, Tag } from '../../types';
import { translateDescription } from '../../services/geminiService';
import { usePhotoAI as useOriginalPhotoAI } from '../photoAi/usePhotoAI';
import { useTaskExecutor } from '../';
import { supabase } from '@/lib/supabase';
import { mapSupabasePhoto } from '@/services/photoService';

/**
 * Admin AI Hook - Wraps original AI hook with TaskExecutor.
 */
export const useAdminAI = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const [aiDebugInfo, setAiDebugInfo] = useState<any>(null);
  const { runTask } = useTaskExecutor();
  
  const originalAiHook = useOriginalPhotoAI(
    user, geminiApiKey, aiProvider, customModel, 
    categories, tags, manufacturers, 
    tagNameToIdMap, photosRef
  );

  const handleTranslate = useCallback(async (zhText: string) => {
    const apiKey = geminiApiKey;
    if (!apiKey) throw new Error('请先在设置中设定 AI 密钥');
    return await translateDescription(zhText, apiKey, customModel);
  }, [geminiApiKey, customModel]);

  const analyzeGroupById = useCallback(async (groupId: string) => {
    return await runTask(`获取并识别群组照片`, async ({ updateProgress }) => {
      updateProgress(10, '正在获取群组内所有照片...');
      
      const { data, error } = await supabase
        .from('furniture_items')
        .select('id, name, item_code, manual_code, model_number, image_hash, category_id, manufacturer_id, sub_category, description, image_url, thumb_url, thumb_hash, created_at, updated_at, group_id, is_group_cover, is_hidden, is_pinned, is_analyzing, user_id, price, description_translations, dimensions, group_order, photo_tags(tag_id)')
        .eq('group_id', groupId);
        
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('该群组内未找到照片');
      
      const groupPhotos = data.map(mapSupabasePhoto);
      updateProgress(30, `已找到 ${groupPhotos.length} 张照片，开始识别...`);
      
      await originalAiHook.analyzeBatch(groupPhotos, true); // true for forceAll if needed, or false to skip already analyzed
    });
  }, [runTask, originalAiHook.analyzeBatch]);

  return useMemo(() => ({
    analyzeSingle: originalAiHook.analyzeSingle,
    analyzeBatch: originalAiHook.analyzeBatch,
    analyzeGroup: originalAiHook.analyzeGroup,
    analyzeGroupById,
    aiDebugInfo,
    setAiDebugInfo,
    abortAnalysis: originalAiHook.abortAnalysis,
    handleTranslate
  }), [
    originalAiHook.analyzeSingle, 
    originalAiHook.analyzeBatch, 
    originalAiHook.analyzeGroup,
    analyzeGroupById,
    aiDebugInfo,
    originalAiHook.abortAnalysis,
    handleTranslate
  ]);
};
