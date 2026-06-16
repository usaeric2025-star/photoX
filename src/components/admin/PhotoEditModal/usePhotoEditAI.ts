import { logger } from '@/lib/logger';
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { showToast } from '@/lib/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTaskExecutor, useAdminMaintenance, useSettings, useCategories, useTags, useFilters } from '@/hooks';
import { analyzePhoto } from '@/services/ai/commands';
import { useUIStore } from '@/store';

/**
 * Hook to handle AI Analysis and backfilling for Photo Editing
 */
export function usePhotoEditAI() {
  const { setValue } = useFormContext();
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const appLang = useUIStore((s) => s.appLang);
  const { runTask } = useTaskExecutor();
  const { updatePhoto: { mutateAsync: updatePhoto } } = useAdminMaintenance();
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  // Fetch reference data for matching
  const { data: categories = [] } = useCategories();
  const { data: allTags = [] } = useTags();

  const handleAiAnalyze = async (previewSrc?: string, imageUrl?: string) => {
    const finalImageUrl = previewSrc || imageUrl;
    if (!finalImageUrl || !editPhotoId) {
      showToast.error(appLang === 'zh' ? '照片信息缺失，无法分析' : 'Photo data missing');
      return;
    }

    try {
      await runTask(appLang === 'zh' ? "AI 识别" : "AI Identification", async ({ updateProgress }) => {
        updateProgress(15, appLang === 'zh' ? '正在准备分析照片...' : 'Preparing photo files...');
        
        updateProgress(40, appLang === 'zh' ? '正在由 Agnes AI 智能识别各项属性 (约需 2-3 秒)...' : 'Analyzing attributes with Agnes AI (approx 2-3s)...');
        const resp = await analyzePhoto(editPhotoId);
        
        updateProgress(80, appLang === 'zh' ? '正在解析模型识别结果并写入草稿表单...' : 'Parsing AI attributes and injecting...');
        if (resp) {
          let result = resp as any;
          if (Array.isArray(result) && result.length > 0) {
            result = result[0];
          }
          
          if (result && typeof result === 'object') {
            const updates: any = {};
            
            if (result.name) {
              updates.name = typeof result.name === 'object'
                ? {
                    zh: result.name.zh || '',
                    en: result.name.en || '',
                    ms: result.name.ms || ''
                  }
                : { zh: String(result.name), en: '', ms: '' };
            }

            // --- Strict Category Matching ---
            if (result.category_id !== undefined && result.category_id !== null) {
              const rawCat = result.category_id;
              let targetId: string | undefined;

              // 1. Try to extract string value
              let catStr = '';
              if (Array.isArray(rawCat) && rawCat.length > 0) {
                  const first = rawCat[0];
                  catStr = String(first.id ?? first.category_id ?? first.name ?? first);
              } else if (typeof rawCat === 'object' && rawCat !== null) {
                  catStr = String(rawCat.id ?? rawCat.category_id ?? rawCat.name ?? '');
              } else {
                  catStr = String(rawCat);
              }

              if (catStr && catStr !== 'undefined' && catStr !== 'null' && catStr !== '[object Object]' && catStr !== '[对象 对象]') {
                  // 2. Exact ID match
                  const exactMatch = categories.find(c => String(c.id) === catStr);
                  if (exactMatch) {
                      targetId = String(exactMatch.id);
                  } else {
                      // 3. Fuzzy Name match (Case-insensitive)
                      const nameMatch = categories.find(c => 
                          c.name.toLowerCase() === catStr.toLowerCase() ||
                          (c.zh && c.zh.toLowerCase() === catStr.toLowerCase())
                      );
                      if (nameMatch) targetId = String(nameMatch.id);
                  }
              }

              if (targetId) updates.category_id = targetId;
            }

            // --- Strict Group Matching and Assignment Support ---
            if (result.group_id !== undefined && result.group_id !== null) {
              const rawGroup = result.group_id;
              let targetGroupId: string | null = null;
              if (typeof rawGroup === 'string' && rawGroup.trim().length > 0 && rawGroup !== 'null' && rawGroup !== 'undefined') {
                targetGroupId = rawGroup.trim();
              } else if (typeof rawGroup === 'object' && rawGroup !== null) {
                targetGroupId = String(rawGroup.id || rawGroup.group_id || '');
              }
              if (targetGroupId && targetGroupId !== 'undefined' && targetGroupId !== 'null') {
                updates.group_id = targetGroupId;
              }
            }

            // --- Strict Tag Matching (Full format-compatible) with auto-creation ---
            const sourceTags = Array.isArray(result.tagNames) ? result.tagNames : (Array.isArray(result.tag_names) ? result.tag_names : []);
            const sourceTagIds = Array.isArray(result.tagIds) ? result.tagIds : (Array.isArray(result.tag_ids) ? result.tag_ids : []);

            const rawNames: string[] = sourceTags.map((rawTag: any) => {
                if (rawTag && typeof rawTag === 'object') {
                    return String(rawTag.name ?? rawTag.id ?? rawTag.tag_id ?? '');
                }
                return String(rawTag);
            }).filter(Boolean);

            const parsedTagIds = sourceTagIds.map((t: any) => {
                if (t && typeof t === 'object') {
                    return String(t.id ?? t.tag_id ?? t.name ?? '');
                }
                return String(t);
            }).filter(Boolean);

            const resolvedIds: string[] = [];
            parsedTagIds.forEach((idOrName: string) => {
                const found = allTags.find((t: any) => String(t.id) === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
                if (found) {
                    resolvedIds.push(String(found.id));
                } else {
                    rawNames.push(idOrName);
                }
            });

            let uniqueRawNames = Array.from(new Set(rawNames));
            let finalResolvedIds = [...resolvedIds];

            // Prevent tags that perfectly match the chosen category name
            if (updates.category_id) {
                const chosenCategory = categories.find(c => String(c.id) === updates.category_id);
                if (chosenCategory) {
                    const catNames = [
                        chosenCategory.name.toLowerCase(),
                        chosenCategory.zh?.toLowerCase(),
                        chosenCategory.en?.toLowerCase(),
                        chosenCategory.ms?.toLowerCase()
                    ].filter(Boolean);
                    
                    uniqueRawNames = uniqueRawNames.filter(n => !catNames.includes(n.toLowerCase()));
                    
                    // Also filter out resolved tags that have the same name
                    finalResolvedIds = finalResolvedIds.filter(id => {
                      const tag = allTags.find(t => String(t.id) === id);
                      if (!tag) return true;
                      return !catNames.includes(tag.name.toLowerCase());
                    });
                }
            }

            uniqueRawNames = uniqueRawNames.slice(0, 10);

            if (uniqueRawNames.length > 0 || finalResolvedIds.length > 0) {
              try {
                const { resolveTagNamesToIds } = await import('@/services/tag/completion');
                const resolveResult = await resolveTagNamesToIds(uniqueRawNames, allTags);

                let finalTagIds = [...finalResolvedIds];
                if (resolveResult && resolveResult.length > 0) {
                    finalTagIds = [...finalTagIds, ...resolveResult];
                }

                if (finalTagIds.length > 0) {
                    const uniqueIds = Array.from(new Set(finalTagIds)).slice(0, 3);
                    
                    // Refetch/Invalidate tags so the tag select options are in sync
                    queryClient.invalidateQueries({ queryKey: ['tags'] });
                    
                    const { loadTagsFromCloud } = await import('@/services/tag/queries');
                    const latestTags = await loadTagsFromCloud().catch(() => allTags);

                    // Optimistically set the React Query cache for tags so they display IMMEDIATELY
                    const { queryKeys } = await import('@/lib/query/keys');
                    queryClient.setQueryData(queryKeys.tags.tags(), (old: any) => {
                      const oldTags = Array.isArray(old) ? old : [];
                      const existingMap = new Map(oldTags.map((t: any) => [String(t.id), t]));
                      latestTags.forEach((t: any) => existingMap.set(String(t.id), t));
                      return Array.from(existingMap.values());
                    });

                    updates.tags = uniqueIds.map(id => {
                      const found = latestTags.find((t: any) => String(t.id) === id) || allTags.find((t: any) => String(t.id) === id);
                      if (found) {
                        return { id: found.id, name: found.name || '' };
                      }
                      // Fallback
                      const matchingRaw = [...sourceTags, ...sourceTagIds].find((raw: any) => {
                        const rStr = typeof raw === 'object' ? String(raw.id ?? raw.tag_id ?? raw.name ?? '') : String(raw);
                        return rStr.toLowerCase() === id.toLowerCase();
                      });
                      const nameVal = typeof matchingRaw === 'object' ? (matchingRaw.name || id) : (matchingRaw || id);
                      return { id, name: String(nameVal) };
                    });
                } else {
                    updates.tags = [];
                }
              } catch (err: any) {
                logger.error('Tags auto-creation failed:', err);
                updates.tags = [];
              }
            } else {
              updates.tags = [];
            }

            if (result.description) {
              updates.description = typeof result.description === 'object'
                ? {
                    zh: result.description.zh || '',
                    en: result.description.en || '',
                    ms: result.description.ms || ''
                  }
                : { zh: String(result.description), en: '', ms: '' };
            }
            if (Array.isArray(result.dimensions)) {
              updates.dimensions = result.dimensions.map((d: any) => ({
                label: String(d.label || 'Dimension'),
                unit: (d.unit === 'inch' || d.unit === 'mm') ? d.unit : 'cm',
                length: Number(d.length) || 0,
                width: Number(d.width) || 0,
                height: Number(d.height) || 0,
                is_ai_estimated: !!d.is_ai_estimated,
                is_ai: true
              }));
            }
            // Invalidate the cache to instantly reveal JSON output in AI tab
            queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', editPhotoId] });

            Object.entries(updates).forEach(([key, value]) => {
              setValue(key as any, value, { shouldDirty: true });
            });

            try {
              await updatePhoto({ id: editPhotoId, updates, silent: true });
              
              // [V2.2] Standard invalidation per architecture rules
              const { queryKeys } = await import('@/lib/query/keys');
              queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
              queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
              
              showToast.success(appLang === 'zh' ? '已识别并保存' : 'Identified & Saved');
            } catch (saveError: unknown) {
              logger.error("Auto-save failed:", saveError);
              showToast.error(appLang === 'zh' ? '识别成功，自动保存失敗' : 'Analysis ok, save failed');
            }
          } else {
            throw new Error(appLang === 'zh' ? 'AI 返回格式异常' : 'Invalid AI format');
          }
        } else {
          throw new Error(appLang === 'zh' ? 'AI 属性智能识别失败' : 'AI analysis failed');
        }
      }, { showSuccessToast: false, showProgress: true });
    } catch (e) {
      // runTask rethrows by default, we catch here to avoid unhandled promise rejections on task failure
      logger.warn('[AI Analyze Failed]', e);
    }
  };

  return { handleAiAnalyze };
}
