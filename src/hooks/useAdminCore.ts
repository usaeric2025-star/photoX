import React, { useState, useCallback } from 'react';
import { 
  saveSettings as saveSettingsCloud, 
  syncPhotosToCloud as syncPhotosToCloudService,
  updatePhotosGroupInCloud,
  addTagToDB,
  supabase
} from '../services/supabaseService';
import { updatePhotoInCloud } from '../services/photoService';
import { saveData } from '../utils/indexedDB';

import { useGalleryContext } from '../context/GalleryContext';
import { useOptionalAdminSession, useOptionalAdminUI } from '../context/AdminContexts';
import { normalizeTagName, normalizeManufacturerName } from '../utils/stringHelper';

const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name) return true;
  const lower = name.toLowerCase();
  return (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /^[\d\s\-_]+$/.test(name) ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(name) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower) ||
    name.length < 3
  );
};

export const useAdminCore = (
  user: any,
  updateForm: Function,
  t: any,
  refreshCloudData: Function,
  lastSyncTime?: number | null,
  adminUI?: any,
  adminSession?: any,
  addManufacturer?: (name: string) => Promise<any>
) => {
  const {
    photos, setPhotos,
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers
  } = useGalleryContext();

  const { settings, setSettings = () => {}, setIsSyncing = () => {} } = adminSession || {};
  const { setAlertDialog = () => {}, setPromptDialog = () => {}, setCloudCount = () => {} } = adminUI || {};

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const saveSettings = useCallback(async (s: any) => {
    try {
      setSettings(s);
      await saveData('product_settings', s);
      if (user) {
        const { categories: cats, manufacturers: mfrs } = s;
        setTimeout(() => {
          saveSettingsCloud({
            ...s,
            categories: cats || categories,
            manufacturers: mfrs || manufacturers
          }).catch((err: any) => {
            console.error(err);
            setAlertDialog({ title: '保存设置失败', message: err.message });
          });
        }, 0);
      }
    } catch (err: any) {
      console.error(err);
      setAlertDialog({ title: '保存数据失败', message: err.message });
    }
  }, [user, categories, tags, manufacturers, setSettings, setAlertDialog]);

  const handleSingleAiAnalyzeCallback = useCallback(async (
    data: string, 
    catId?: string, 
    editPhotoId?: string, 
    formState?: any, 
    updateFormFn?: any,
    handleSingleAiAnalyzeService?: any
  ) => {
    if(!handleSingleAiAnalyzeService) return;
    try {
      const result = await handleSingleAiAnalyzeService(data, catId, editPhotoId);
      if (result) {
        // Recognition feedback alert - find names for better readability
        const catNameStr = categories.find(c => String(c.id) === String(result.categoryId))?.zh || result.newCategoryName || '未识别';
        const tagNamesStr = [
            ...(result.tagIds || []).map((id: string) => tags.find(t => String(t.id) === String(id))?.name).filter(Boolean),
            ...(result.newTags || [])
        ];
        const resultMessage = `✅ AI 识别完成\n\n名称：${result.name || '未识别'}\n分类：${catNameStr}\n标签：${tagNamesStr.join(', ') || '无'}`;
        
        setAlertDialog({ title: 'AI 识别结果 / AI Analysis Result', message: resultMessage });

        const updates: Partial<any> = {};
        if (result.name && shouldUpdateName(formState.name)) {
          updates.name = result.name;
        }
        
        if (result.categoryId && !catId && !formState.categoryId) {
          updates.categoryId = result.categoryId;
        } else if (result.newCategoryName && !catId && !formState.categoryId) {
          const foundCat = categories?.find(c => c.zh === result.newCategoryName || c.en === result.newCategoryName || c.name === result.newCategoryName);
          if (foundCat) updates.categoryId = foundCat.id;
        }

        if (result.tagIds) {
          updates.tagIds = Array.isArray(result.tagIds) ? result.tagIds : (typeof result.tagIds === 'string' ? [result.tagIds] : []);
        }
        
        if (result.dimensions) {
          if (Array.isArray(result.dimensions)) {
              updates.dimensions = result.dimensions;
              if (result.dimensions.length > 0) {
                const first = result.dimensions[0];
                if (first.length && !formState.dimL) updates.dimL = first.length.toString();
                if (first.width && !formState.dimW) updates.dimW = first.width.toString();
                if (first.height && !formState.dimH) updates.dimH = first.height.toString();
              }
          } else if (typeof result.dimensions === 'object') {
              if ((result.dimensions as any).length && !formState.dimL) updates.dimL = (result.dimensions as any).length.toString();
              if ((result.dimensions as any).width && !formState.dimW) updates.dimW = (result.dimensions as any).width.toString();
              if ((result.dimensions as any).height && !formState.dimH) updates.dimH = (result.dimensions as any).height.toString();
              updates.dimensions = [result.dimensions];
          }
        }

        if (result.modelNumber && !formState.model_number) updates.model_number = result.modelNumber;
        if (result.manualCode && !formState.manual_code) updates.manual_code = result.manualCode;
        if (result.description && !formState.description) updates.description = result.description;
        
        updateFormFn(updates);
        
        const updateMessages: string[] = [];
        if ('name' in updates) updateMessages.push('商品名称');
        if ('categoryId' in updates) updateMessages.push('目录分类');
        if ('tagIds' in updates) updateMessages.push('商品标签');
        if ('dimL' in updates || 'dimW' in updates || 'dimH' in updates || 'dimensions' in updates) updateMessages.push('尺寸信息');
        if ('model_number' in updates) updateMessages.push('型号');
        if ('manual_code' in updates) updateMessages.push('原厂编号');
        if ('description' in updates) updateMessages.push('商品描述');
        
        const msg = updateMessages.length > 0 
          ? `AI 已帮您自动填入：${updateMessages.join('，')}。` 
          : 'AI 识别完成，但没有需要更新的空白字段 (或未能识别到额外信息)。';
          
        setAlertDialog({ title: 'AI 分析结果', message: msg });
      } else {
        setAlertDialog({ title: 'AI 分析', message: '未能从图片分析出有效数据。' });
      }
    } catch (err: any) {
      console.error(err);
      setAlertDialog({ 
        title: 'AI 识别失败', 
        message: err.message || '请检查网络或 API 密钥' 
      });
    }
  }, [setAlertDialog, categories, tags]);

  const performPushSync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await saveSettingsCloud({
        ...settings,
        categories,
        manufacturers
      });
      const lastSyncISO = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
      const result = await syncPhotosToCloudService(user.id, photos, lastSyncISO);
      const now = new Date().toISOString();
      localStorage.setItem('lastSyncTime', now);
      await saveData('last_sync_time', Date.now()); // Keep for legacy if needed but primary is localStorage
      refreshCloudData(user, false, setCloudCount); // Non-forced, using the time we just set to confirm everything is in sync
      
      setAlertDialog({ 
        title: t.pushSuccess, 
        message: t.pushSuccessMsg(result.skipped) 
      });
    } catch (err: any) {
      setAlertDialog({ title: t.pushFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, photos, settings, categories, tags, manufacturers, setIsSyncing, setAlertDialog, t, refreshCloudData, setCloudCount, lastSyncTime]);

  const performPullSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refreshCloudData(user, true, setCloudCount);
      setAlertDialog({ title: t.pullSuccess, message: t.pullSuccessMsg });
    } catch (err: any) {
      setAlertDialog({ title: t.pullFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, setIsSyncing, setAlertDialog, t, refreshCloudData, setCloudCount]);

  const handleUngroup = useCallback(async (groupId: string) => {
    try {
      const photosToUngroup = photos.filter(p => p.groupId === groupId);
      const photoIds = photosToUngroup.map(p => p.id);
      
      if (photoIds.length > 0) {
        await updatePhotosGroupInCloud(photoIds, null);
        await Promise.all(photoIds.map(id => updatePhotoInCloud(id, { is_pinned: false })));
        setPhotos(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null, isPinned: false } : p));
        showToast('已解除群組並清除置頂', 'success');
      }
    } catch (err: any) {
      console.error('Ungroup error:', err);
      setAlertDialog({ title: '解除群組失敗', message: err?.message || '未知錯誤' });
    }
  }, [photos, setPhotos, showToast, setAlertDialog, updatePhotoInCloud]);

  const handleGroupPhotos = useCallback(async (ids: string[]) => {
    if (ids.length < 2) return;
    
    const existingGroupIds: string[] = Array.from(new Set(
      photos.filter(p => ids.includes(p.id) && p.groupId).map(p => p.groupId as string)
    ));
    
    const groupIdToUse = existingGroupIds.length > 0 ? existingGroupIds[0]! : `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const allPhotosToGroup = photos.filter(p => 
      ids.includes(p.id) || (p.groupId && existingGroupIds.includes(p.groupId))
    );
    
    const photoIdsToUpdate = allPhotosToGroup.map(p => p.id);

    const updatedPhotos = photos.map(p => photoIdsToUpdate.includes(p.id) ? { ...p, groupId: groupIdToUse } : p);
    setPhotos(updatedPhotos);
    try {
      await updatePhotosGroupInCloud(photoIdsToUpdate, groupIdToUse);
      showToast('已完成群組', 'success');
    } catch (err: any) {
      console.error('Group photos error:', err);
      setAlertDialog({ title: '群組失敗', message: err?.message || '未知錯誤' });
    }
  }, [photos, setPhotos, showToast, setAlertDialog]);

  const quickAddSubCategory = useCallback((formState: any) => {
    if (!formState.categoryId) return;
    setPromptDialog({
      title: '新增厂商',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = normalizeManufacturerName(val);
        if (!trimmed) return;
        
        try {
          if (addManufacturer) {
            const savedMfr = await addManufacturer(trimmed);
            if (savedMfr) {
               updateForm((prev: any) => ({ 
                 ...prev, manufacturerId: savedMfr.id 
               }));
               showToast(`已新增厂商 "${trimmed}"`);
            }
          } else {
            // Fallback if not injected (unlikely but safe)
            const newMfr = { id: crypto.randomUUID(), name: trimmed };
            setManufacturers(prev => [...prev, newMfr]);
            updateForm((prev: any) => ({ ...prev, manufacturerId: newMfr.id }));
          }
        } catch (err: any) {
          console.error('[API Error] 新增厂商失败:', err);
          setAlertDialog({ title: '新增厂商失败', message: err.message });
        }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm, showToast, setManufacturers, setAlertDialog]);

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签',
      placeholder: '输入新标签名称 (例如 清货)',
      onSubmit: async (val: string) => {
        const normalized = normalizeTagName(val);
        if (!normalized) return;

        const existing = tags.find(t => t.name.toUpperCase() === normalized);
        
        if (existing) {
          const entryId = String(existing.id);
          updateForm((prev: any) => {
            const safeTags = Array.isArray(prev.tagIds) ? prev.tagIds.map(String) : [];
            if (safeTags.includes(entryId)) return prev;
            return { ...prev, tagIds: [...safeTags, entryId] };
          });
          showToast(`标签 "${normalized}" 已存在`);
          return;
        }
        
        setIsSyncing(true);
        try {
          const savedTag = await addTagToDB(normalized);
          
          // 4. 更新全局标签列表（让 tagMap 包含新标签）
          setTags(prev => [...prev, savedTag]);
          
          // 5. 更新当前照片的 tagIds（让这张照片立即关联新标签）
          updateForm((prev: any) => {
            const safeTags = Array.isArray(prev.tagIds) ? prev.tagIds.map(String) : [];
            return { ...prev, tagIds: [...safeTags, String(savedTag.id)] };
          });
          
          showToast(`已新增标签 "${normalized}"`);
        } catch (err: any) {
          console.error(err);
          setAlertDialog({ title: '新增标签失败', message: err.message });
        } finally {
          setIsSyncing(false);
        }
      }
    });
  }, [tags, updateForm, setTags, setPromptDialog, setAlertDialog, setIsSyncing, showToast]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = normalizeManufacturerName(val);
        if (!trimmed) return;
        
        try {
          if (addManufacturer) {
            const savedMfr = await addManufacturer(trimmed);
            if (savedMfr) {
              updateForm((prev: any) => ({ ...prev, manufacturerId: savedMfr.id }));
              showToast(`已新增厂商 "${trimmed}"`);
            }
          } else {
            const newMfr = { id: crypto.randomUUID(), name: trimmed };
            setManufacturers(prev => [...prev, newMfr]);
            updateForm((prev: any) => ({ ...prev, manufacturerId: newMfr.id }));
          }
        } catch (err: any) {
          console.error('[API Error] 新增厂商失败:', err);
          setAlertDialog({ title: '新增厂商失败', message: err.message });
        }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm, showToast, setManufacturers, setAlertDialog]);

  return {
    toast, showToast,
    saveSettings,
    performPushSync, performPullSync,
    handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos,
    quickAddSubCategory, quickAddTag, quickAddManufacturer
  };
};
