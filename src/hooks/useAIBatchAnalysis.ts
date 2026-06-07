import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useTaskExecutor, useInvalidatePhotos } from '@/hooks';
import { toast } from 'sonner';

function isPlaceholderName(nameStr: string): boolean {
  if (!nameStr) return true;
  const s = nameStr.trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined' || s === '{}' || s === '[object object]') {
    return true;
  }
  // 1. Purely numeric name, or 32-character MD5 hash / 36-character UUID
  if (/^\d+$/.test(s) || /^[a-f0-9]{32}$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return true;
  }
  // 2. Typical camera prefix filenames, screenshots, downloads, or generic web uploads
  if (
    s.startsWith('img_') ||
    s.startsWith('dsc_') ||
    s.startsWith('pxl_') ||
    s.startsWith('screenshot') ||
    s.startsWith('upload_') ||
    s.startsWith('temp-') ||
    s.startsWith('image_') ||
    s.startsWith('img-') ||
    s.startsWith('dsc-') ||
    /^(img|dsc|pxl)\d+/i.test(s)
  ) {
    return true;
  }
  return false;
}

function isMeaningfulText(text: any): boolean {
  if (!text) return false;
  if (typeof text === 'object') {
    const zh = String(text.zh || '').trim();
    const en = String(text.en || '').trim();
    const ms = String(text.ms || '').trim();
    const checkStr = (str: string) => {
      return str !== '' && str !== '[object Object]' && str !== '{}' && str !== 'null' && str !== 'undefined';
    };
    return checkStr(zh) || checkStr(en) || checkStr(ms);
  }
  if (typeof text === 'string') {
    const s = text.trim();
    return s !== '' && s !== '[object Object]' && s !== '{}' && s !== 'null' && s !== 'undefined';
  }
  return false;
}

function hasExistingInfo(p: Photo): boolean {
  // 1. Check description - if there's any user-written description, it wins
  if (isMeaningfulText(p.description)) {
    return true;
  }

  // 2. Check category or custom tags
  if (p.category_id && p.category_id !== 'uncategorized') {
    return true;
  }
  if (Array.isArray(p.tag_ids) && p.tag_ids.length > 0) {
    return true;
  }

  // 3. Check name
  const nameVal = p.name;
  if (nameVal) {
    if (typeof nameVal === 'object') {
      const zhName = String(nameVal.zh || '').trim();
      const enName = String(nameVal.en || '').trim();
      const msName = String(nameVal.ms || '').trim();
      
      const hasRealZh = zhName !== '' && !isPlaceholderName(zhName);
      const hasRealEn = enName !== '' && !isPlaceholderName(enName);
      const hasRealMs = msName !== '' && !isPlaceholderName(msName);
      
      if (hasRealZh || hasRealEn || hasRealMs) {
        return true;
      }
    } else if (typeof nameVal === 'string') {
      if (!isPlaceholderName(nameVal)) {
        return true;
      }
    }
  }

  return false;
}

export function useAIBatchAnalysis() {
  const { runTask } = useTaskExecutor();
  const invalidatePhotos = useInvalidatePhotos();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error('请先选择照片 / Please select photos first');
      return;
    }

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

    await runTask(taskTitle, async ({ updateProgress }) => {
        let successCount: number = 0;
        const totalPhotosToProcess = targetPhotos.length;
        let progress = 0;

        // 1. Analyze photos
        const { analyzePhoto } = await import('@/services/ai/commands');
        const { updatePhoto: directUpdatePhoto } = await import('@/services/photo/commands');
        
        const withTimeout = (promise: Promise<any>, ms: number) => {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时')), ms)
            );
            return Promise.race([promise, timeout]);
        };
        
        for (let i = 0; i < targetPhotos.length; i++) {
          const p = targetPhotos[i];
          
          if (hasExistingInfo(p)) {
            console.log(`Skipping photo ${p.id} from AI analysis as it already holds meaningful descriptive metadata.`);
            progress = ((i + 1) / totalPhotosToProcess) * (groupId ? 70 : 100);
            updateProgress(progress, `保留已有信息: ${i + 1}/${totalPhotosToProcess}`);
            continue;
          }

          try {
            updateProgress(progress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
            const resp = await withTimeout(analyzePhoto(p.id), 60000); // 60s timeout
            
            if (resp && 'ok' in resp && resp.ok) {
              const result = resp.data;
              const updates: any = {};
              
              if (result.name) updates.name = result.name;
              if (result.category_id) updates.category_id = String(result.category_id);
              if (Array.isArray(result.tag_ids)) {
                updates.tag_ids = result.tag_ids.slice(0, 3).map((id: any) => String(id));
              }
              if (result.description) updates.description = result.description;
              if (result.description_translations) updates.description_translations = result.description_translations;
              if (Array.isArray(result.dimensions)) updates.dimensions = result.dimensions;
              if (result.price) updates.price = String(result.price);

              const updateResult = await directUpdatePhoto(p.id, updates);
              if (updateResult && 'ok' in updateResult && updateResult.ok) {
                successCount++;
              }
            }
          } catch (err: any) {
            console.error(`Failed to analyze photo ${p.id}:`, err);
          }
          progress = ((i + 1) / totalPhotosToProcess) * (groupId ? 70 : 100);
          updateProgress(progress);
        }

        let groupSuccess = false;

        // 2. Analyze group
        if (groupId) {
           try {
              updateProgress(75, '正在总结合组...');
              const { analyzeGroup } = await import('@/services/gemini/groupAnalysis');
              
              const { supabase } = await import('@/lib/supabase');
              const { data: photos } = await supabase.from('furniture_items').select('id, name, tag_ids, description').in('id', targetPhotos.map(p => p.id));
              
              if (photos) {
                const allTagIds = Array.from(new Set(photos.flatMap(p => p.tag_ids || [])));
                let tagsData: any[] | null = null;
                if (allTagIds.length > 0) {
                  const res = await supabase.from('tags').select('id, name').in('id', allTagIds);
                  tagsData = res.data;
                }
                const tagMap = new Map((tagsData || []).map(t => [String(t.id), t.name]));
                const photosWithTags = photos.map(p => ({
                  ...p,
                  tagNames: (p.tag_ids || []).map((tid: string) => tagMap.get(String(tid)) || '').filter(Boolean)
                })) as any;

                const analysis = await withTimeout(analyzeGroup(photosWithTags), 120000); // 120s timeout
                const { name, description, colors, materials } = analysis;

                let finalName = { ...name };
                let finalDescription = {
                  zh: description,
                  en: description,
                  ms: description
                };

                try {
                  updateProgress(85, '正在翻译合组信息...');
                  const { data: settingsData } = await supabase.from('settings').select('gemini_api_key, custom_model').single();
                  const { translateProductFields } = await import('@/services/gemini/translationCore');
                  const pTranslations = await translateProductFields({
                    name: name.zh,
                    description,
                    colors,
                    materials
                  }, settingsData?.gemini_api_key || '', settingsData?.custom_model || '');

                  finalName.en = pTranslations.name_en || name.en || name.zh;
                  finalName.ms = pTranslations.name_ms || name.ms || name.zh;
                  finalDescription.en = pTranslations.description_en || description;
                  finalDescription.ms = pTranslations.description_ms || description;
                } catch (e) {
                  console.warn('Group translations skipped:', e);
                }

                updateProgress(95, '正在保存合组...');
                const { updateGroup } = await import('@/services/group/commands');
                const updateRes = await updateGroup(groupId, {
                   name: finalName as any,
                   description: finalDescription as any,
                   colors,
                   materials
                });
                
                if (updateRes && 'ok' in updateRes && !updateRes.ok) {
                  throw new Error(updateRes.message || '保存合组失败');
                }
                groupSuccess = true;
              }
           } catch (e: any) {
              console.error('Group analysis failed', e);
              throw e;
           }
        }
        
        await invalidatePhotos();
        if (groupId && groupSuccess) {
          if (successCount > 0) {
            toast.success(`成功分析并更新合组信息，且更新了 ${successCount} 张照片`);
          } else {
            toast.success('成功分析并更新合组信息');
          }
        } else if (successCount > 0) {
          toast.success(`成功分析 ${successCount} 张照片`);
        } else {
          toast.success('分析完成 (无更新)');
        }
        return successCount;
    }, { showProgress: true, showSuccessToast: false });
  }, [runTask, invalidatePhotos]);

  return { handleBatchAiAnalyze };
}
