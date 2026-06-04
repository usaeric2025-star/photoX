import { Photo } from '../types';
import { analyzeProductPhoto } from './gemini';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { ok, err, AppResult } from '@/lib/errorFactory';
import { ErrorFactory } from '../lib/error/ErrorFactory';

/**
 * [V2.0-SERVICE-SINGLETON] AI Photo Analysis Service
 */
export const analyzePhoto = async (photoId: string): Promise<AppResult<any>> => {
  try {
    // 1. Fetch photo data to get image URL
    const { data: photo, error: fetchError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id, name, image_url, category_id')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      throw ErrorFactory.wrap(new Error(fetchError?.message || '未找到照片记录'), 'analyzePhoto', photoId);
    }

    if (!photo.image_url) {
      throw ErrorFactory.wrap(new Error('该照片没有可供识别的图片链接'), 'analyzePhoto', photoId);
    }

    // 2. Load context (categories, tags, etc)
    const [
      { data: categories = [] },
      { data: tags = [] },
      { data: manufacturers = [] },
      { data: settings }
    ] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('tags').select('*'),
      supabase.from('manufacturers').select('*'),
      supabase.from('settings').select('*').maybeSingle()
    ]);

    const apiKey = (settings as any)?.gemini_api_key || (settings as any)?.api_key;
    if (!apiKey) {
      throw ErrorFactory.wrap(new Error('Gemini API Key 未配置，请前往设置页面'), 'analyzePhoto', photoId);
    }

    const customModel = (settings as any)?.custom_model || (settings as any)?.model_name || '';

    // 3. Call AI Core
    const result = await analyzeProductPhoto(
      photo.image_url,
      categories || [],
      tags || [],
      manufacturers || [],
      apiKey,
      'google',
      customModel,
      photo.category_id,
      photo.name
    );

    // 4. Update the photo record with AI suggestions (optional, or just return result)
    // For consistency with PhotoEditDrawer, we just return the result and let the UI handle the "Apply" step
    return ok(result);
  } catch (e: any) {
    return err(e.message || 'AI 分析异常', 'UNKNOWN');
  }
};
