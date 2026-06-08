import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useTaskExecutor, useInvalidatePhotos } from '@/hooks';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { groupKeys } from '@/lib/queryKeys';

function isPlaceholderText(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined' || s === '{}' || s === '[object object]' || s === 'n/a' || s === 'na' || s === 'none') {
    return true;
  }
  const placeholders = ['暂无', '置顶', '无', '未命名', '不知名', '说明', '请填写', '描述', '产品描述', '暂无说明', '未命名产品'];
  if (placeholders.some(p => s.includes(p))) {
    return true;
  }
  return false;
}

function isPlaceholderName(nameStr: string): boolean {
  if (!nameStr) return true;
  const s = nameStr.trim().toLowerCase();
  if (s === '' || s === 'null' || s === 'undefined' || s === '{}' || s === '[object object]') {
    return true;
  }
  if (isPlaceholderText(s)) {
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
      if (isPlaceholderText(str)) return false;
      return str.length > 5;
    };
    return checkStr(zh) || checkStr(en) || checkStr(ms);
  }
  if (typeof text === 'string') {
    return !isPlaceholderText(text) && text.trim().length > 5;
  }
  return false;
}

function hasExistingInfo(p: Photo): boolean {
  let hasRealName = false;
  const nameVal = p.name as any;
  if (nameVal) {
    if (typeof nameVal === 'object') {
      const zhName = String(nameVal.zh || '').trim();
      const enName = String(nameVal.en || '').trim();
      const msName = String(nameVal.ms || '').trim();
      
      const hasRealZh = zhName !== '' && !isPlaceholderName(zhName) && !isPlaceholderText(zhName) && zhName.length > 2;
      const hasRealEn = enName !== '' && !isPlaceholderName(enName) && !isPlaceholderText(enName) && enName.length > 2;
      const hasRealMs = msName !== '' && !isPlaceholderName(msName) && !isPlaceholderText(msName) && msName.length > 2;
      
      if (hasRealZh || hasRealEn || hasRealMs) {
        hasRealName = true;
      }
    } else {
      const nameStr = String(nameVal).trim();
      if (!isPlaceholderName(nameStr) && !isPlaceholderText(nameStr) && nameStr.length > 2) {
        hasRealName = true;
      }
    }
  }

  const hasRealDescription = isMeaningfulText(p.description);

  return hasRealName && hasRealDescription;
}

function findCategoryByFuzzy(catInput: any, categories: any[]): string | null {
  if (!catInput) return null;
  
  const searchStrings: string[] = [];
  
  if (typeof catInput === 'object' && catInput !== null) {
    if (catInput.id && typeof catInput.id === 'string' && catInput.id.length > 10) {
      const matching = categories.find(c => String(c.id).toLowerCase() === catInput.id.toLowerCase());
      if (matching) return matching.id;
    }
    if (catInput.name) searchStrings.push(String(catInput.name));
    if (catInput.zh) searchStrings.push(String(catInput.zh));
    if (catInput.en) searchStrings.push(String(catInput.en));
  } else if (typeof catInput === 'string') {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(catInput)) {
      const matching = categories.find(c => String(c.id).toLowerCase() === catInput.toLowerCase());
      if (matching) return matching.id;
    }
    searchStrings.push(catInput);
  }
  
  for (const s of searchStrings) {
    const term = s.trim().toLowerCase();
    if (!term) continue;
    
    // Explicit matches on properties
    let match = categories.find(c => 
      String(c.id).toLowerCase() === term ||
      String(c.name || '').toLowerCase() === term ||
      String(c.zh || '').toLowerCase() === term ||
      String(c.en || '').toLowerCase() === term ||
      String(c.ms || '').toLowerCase() === term
    );
    if (match) return match.id;
    
    // Substring / Inclusion Matches
    match = categories.find(c => 
      String(c.name || '').toLowerCase().includes(term) ||
      term.includes(String(c.name || '').toLowerCase()) ||
      String(c.zh || '').toLowerCase().includes(term) ||
      term.includes(String(c.zh || '').toLowerCase()) ||
      (Array.isArray(c.aliases) && c.aliases.some((a: string) => String(a).toLowerCase().includes(term) || term.includes(String(a).toLowerCase())))
    );
    if (match) return match.id;
  }
  
  return null;
}

function resolveTagIds(tagInputs: any[], tags: any[]): string[] {
  if (!Array.isArray(tagInputs)) return [];
  const resolvedIds = new Set<string>();
  
  for (const input of tagInputs) {
    if (!input) continue;
    
    let searchString = '';
    let incomingId = '';
    
    if (typeof input === 'object' && input !== null) {
      if (input.id && typeof input.id === 'string' && input.id.length > 10) {
        incomingId = input.id;
      }
      searchString = String(input.name || input.zh || input.tag_name || '');
    } else {
      const str = String(input);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
        incomingId = str;
      } else {
        searchString = str;
      }
    }
    
    if (incomingId) {
      const match = tags.find(t => String(t.id).toLowerCase() === incomingId.toLowerCase());
      if (match) {
        resolvedIds.add(match.id);
        continue;
      }
    }
    
    if (searchString) {
      const term = searchString.trim().toLowerCase();
      if (!term) continue;
      
      let match = tags.find(t => 
        String(t.name || '').toLowerCase() === term ||
        String(t.id).toLowerCase() === term
      );
      
      if (!match) {
        match = tags.find(t => 
          String(t.name || '').toLowerCase().includes(term) ||
          term.includes(String(t.name || '').toLowerCase()) ||
          (Array.isArray(t.aliases) && t.aliases.some((a: string) => String(a).toLowerCase().includes(term) || term.includes(String(a).toLowerCase())))
        );
      }
      
      if (match) {
        resolvedIds.add(match.id);
      }
    }
  }
  
  return Array.from(resolvedIds);
}

export function useAIBatchAnalysis() {
  const { runTask } = useTaskExecutor();
  const invalidatePhotos = useInvalidatePhotos();
  const queryClient = useQueryClient();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error('请先选择照片 / Please select photos first');
      return;
    }

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

    await runTask(taskTitle, async ({ updateProgress, taskId }) => {
        let successCount: number = 0;
        const totalPhotosToProcess = targetPhotos.length;
        let progress = 0;

        const { supabase } = await import('@/lib/supabase');
        const { data: settingsData } = await supabase.from('settings').select('gemini_api_key, custom_model').single();

        // Prefetch categories and tags once
        let dbCategories: any[] = [];
        let dbTags: any[] = [];
        try {
          const [{ data: catsRes }, { data: tagsRes }] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('tags').select('*'),
          ]);
          if (catsRes) dbCategories = catsRes;
          if (tagsRes) dbTags = tagsRes;
        } catch (e) {
          console.error("Failed to prefetch categories/tags for resolution", e);
        }
        
        for (let i = 0; i < targetPhotos.length; i++) {
          const p = targetPhotos[i];
          
          if (hasExistingInfo(p)) {
            progress = ((i + 1) / totalPhotosToProcess) * (groupId ? 70 : 100);
            updateProgress(progress, `保留已有信息: ${i + 1}/${totalPhotosToProcess}`);
            continue;
          }

          try {
            updateProgress(progress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
            const { analyzeAndSavePhoto } = await import('@/services/ai/orchestration');
            
            const result = await analyzeAndSavePhoto(p, settingsData, dbTags, dbCategories);
            
            if (result.success) {
                successCount++;
                await invalidatePhotos();
            } else {
                console.error(`Failed AI processing for photo ${p.id}:`, result.error);
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
              const { loadPhotosByIds } = await import('@/services/photo/read');
              
              const res = await loadPhotosByIds(targetPhotos.map(p => p.id));
              if (!res.ok) {
                console.error('Failed to fetch photos for group analysis:', res.message);
                throw new Error('获取产品用于合组分析时失败 / Failed to fetch photos for group analysis: ' + res.message);
              }

              const photos = res.data;
              if (photos) {
                const photosWithTags = photos;

                const analysis = await withTimeout(analyzeGroup(photosWithTags), 120000); // 120s timeout
                const { name, description, colors, materials } = analysis;

                let finalName = { zh: '', en: '', ms: '' };
                if (name && typeof name === 'object') {
                  finalName.zh = name.zh || '';
                  finalName.en = name.en || '';
                  finalName.ms = name.ms || '';
                } else if (typeof name === 'string') {
                  finalName.zh = name;
                }

                let finalDescription = { zh: '', en: '', ms: '' };
                if (description && typeof description === 'object') {
                  finalDescription.zh = description.zh || '';
                  finalDescription.en = description.en || '';
                  finalDescription.ms = description.ms || '';
                } else if (typeof description === 'string') {
                  finalDescription.zh = description;
                  finalDescription.en = description;
                  finalDescription.ms = description;
                }

                try {
                  updateProgress(85, '正在翻译合组信息...');
                  const { data: settingsData } = await supabase.from('settings').select('gemini_api_key, custom_model').single();
                  const { translateProductFields } = await import('@/services/gemini/translationCore');
                  const pTranslations = await translateProductFields({
                    name: finalName.zh,
                    description: finalDescription.zh,
                    colors,
                    materials
                  }, settingsData?.gemini_api_key || '', settingsData?.custom_model || '');

                  finalName.en = pTranslations.name_en || finalName.en || finalName.zh;
                  finalName.ms = pTranslations.name_ms || finalName.ms || finalName.zh;
                  finalDescription.en = pTranslations.description_en || finalDescription.en || finalDescription.zh;
                  finalDescription.ms = pTranslations.description_ms || finalDescription.ms || finalDescription.zh;
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
        
        let finalMessage = "分析完成 (无更新)";
        if (groupId) {
          await queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
        }
        if (groupId && groupSuccess) {
          await queryClient.invalidateQueries({ queryKey: groupKeys.all });
          finalMessage = successCount > 0 
            ? `成功分析并更新合组信息，且更新了 ${successCount} 张照片 / Succeeded in updating group details and analyzing ${successCount} photos!`
            : "成功分析并更新合组信息 / Succeeded in analyzing and updating group details!";
          toast.success(finalMessage);
        } else if (successCount > 0) {
          finalMessage = `成功分析 ${successCount} 张照片 / Successfully analyzed ${successCount} photos!`;
          toast.success(finalMessage);
        } else {
          toast.info("分析完成，没有发现需要更新的数据 / Analysis complete, no fields required updating.");
        }

        // 更新任务中心消息，代替额外的 Toast
        if (taskId) {
           updateProgress(100, finalMessage);
        }

        return successCount;
    }, { showProgress: true, showSuccessToast: false });
  }, [runTask, invalidatePhotos, queryClient]);

  return { handleBatchAiAnalyze };
}
