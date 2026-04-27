import React, { useState, useCallback } from 'react';
import { 
  saveSettings as saveSettingsCloud, 
  syncPhotosToCloud as syncPhotosToCloudService,
  addTagToDB,
  updatePhotosGroupInCloud
} from '../services/supabaseService';
import { saveData } from '../utils/indexedDB';

export const useAdminCore = (
  user: any,
  photos: any[],
  setPhotos: React.Dispatch<React.SetStateAction<any[]>>,
  settings: any,
  setSettings: React.Dispatch<React.SetStateAction<any>>,
  categories: any[],
  setCategories: React.Dispatch<React.SetStateAction<any[]>>,
  tags: any[],
  setTags: React.Dispatch<React.SetStateAction<any[]>>,
  manufacturers: any[],
  setManufacturers: React.Dispatch<React.SetStateAction<any[]>>,
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>,
  setAlertDialog: React.Dispatch<React.SetStateAction<any>>,
  setPromptDialog: React.Dispatch<React.SetStateAction<any>>,
  updateForm: Function,
  t: any,
  refreshCloudData: Function,
  setCloudCount?: Function
) => {
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
        const updates: Partial<any> = {};
        if (result.name && (!formState.name || formState.name === '未命名产品' || formState.name === 'Furniture' || /^(img|image|photo)[\s_-]?\d+/i.test(formState.name) || /\.(jpg|jpeg|png|heic|webp)$/i.test(formState.name))) {
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
      setAlertDialog({ title: 'AI 分析失败', message: err.message });
    }
  }, [setAlertDialog]);

  const performPushSync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await saveSettingsCloud({
        ...settings,
        categories,
        manufacturers
      });
      const result = await syncPhotosToCloudService(user.id, photos);
      const now = Date.now();
      await saveData('last_sync_time', now);
      refreshCloudData(user, categories, tags, manufacturers, setSettings, undefined, undefined, undefined, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, true);
      
      setAlertDialog({ 
        title: t.pushSuccess, 
        message: t.pushSuccessMsg(result.skipped) 
      });
    } catch (err: any) {
      setAlertDialog({ title: t.pushFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, photos, settings, categories, tags, manufacturers, setIsSyncing, setAlertDialog, t, refreshCloudData, setSettings, setCategories, setTags, setManufacturers, setPhotos, setCloudCount]);

  const performPullSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refreshCloudData(
        user, categories, tags, manufacturers, setSettings, 
        undefined, undefined, undefined, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, true
      );
      setAlertDialog({ title: t.pullSuccess, message: t.pullSuccessMsg });
    } catch (err: any) {
      setAlertDialog({ title: t.pullFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, categories, tags, manufacturers, setSettings, setCategories, setTags, setManufacturers, setPhotos, setIsSyncing, setAlertDialog, t, refreshCloudData, setCloudCount]);

  const handleUngroup = useCallback(async (groupId: string) => {
    setPhotos(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null } : p));
    const photoIds = photos.filter(p => p.groupId === groupId).map(p => p.id);
    if (photoIds.length > 0) {
      await updatePhotosGroupInCloud(photoIds, null);
    }
  }, [photos, setPhotos]);

  const handleGroupPhotos = useCallback(async (ids: string[], user: any, savePhotoToCloud: Function) => {
    if (ids.length < 2) return;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const updatedPhotos = photos.map(p => ids.includes(p.id) ? { ...p, groupId } : p);
    setPhotos(updatedPhotos);
    await updatePhotosGroupInCloud(ids, groupId);
  }, [photos, setPhotos]);

  const quickAddSubCategory = useCallback((formState: any) => {
    if (!formState.categoryId) return;
    setPromptDialog({
      title: '新增子分类',
      placeholder: '输入新子分类名称',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        // Since subcategories are still part of the category object in JSON (legacy), 
        // but the goal is to move to tables, we'll use a hack or assume sub_categories table soon.
        // For now, let's get a UUID from the database.
        const savedMfr = await addManufacturerToDB(trimmed);
        const newSubId = savedMfr.id;
        
        const nextCats = categories.map(c => c.id === formState.categoryId || c.code === formState.categoryId ? {
          ...c,
          subcategories: [...(c.subcategories || []), { id: newSubId, name: trimmed, aliases: [] }]
        } : c);
        
        setCategories(nextCats);
        updateForm((prev: any) => ({ ...prev, subcategoryId: newSubId }));
        await saveSettings({ ...settings, categories: nextCats, tags, manufacturers });
      }
    });
  }, [categories, tags, manufacturers, settings, saveSettings, setCategories, updateForm, setPromptDialog]);

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签',
      placeholder: '输入新标签名称',
      onSubmit: async (val: string) => {
        const trimmedName = val.trim();
        if (tags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
          setAlertDialog({ title: '提示', message: '标签已存在' });
          return;
        }
        
        const savedTag = await addTagToDB(trimmedName);
        const newTagId = savedTag.id;
        
        const nextTags = [...tags, savedTag];
        setTags(nextTags);
        updateForm((prev: any) => {
          const safeTags = Array.isArray(prev.tagIds) ? prev.tagIds : (typeof prev.tagIds === 'string' ? [prev.tagIds] : []);
          return { ...prev, tagIds: [...safeTags, newTagId] };
        });
        await saveSettings({ ...settings, categories, tags: nextTags, manufacturers });
      }
    });
  }, [tags, categories, manufacturers, settings, saveSettings, setTags, updateForm, setAlertDialog, setPromptDialog]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        const savedMfr = await addManufacturerToDB(trimmed);
        const newMfrId = savedMfr.id;
        
        const nextMfrs = [...manufacturers, savedMfr];
        setManufacturers(nextMfrs);
        updateForm((prev: any) => ({ ...prev, subcategoryId: newMfrId }));
        await saveSettings({ ...settings, categories, tags, manufacturers: nextMfrs });
      }
    });
  }, [manufacturers, categories, tags, settings, saveSettings, setManufacturers, updateForm, setPromptDialog]);

  return {
    toast, showToast,
    saveSettings,
    performPushSync, performPullSync,
    handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos,
    quickAddSubCategory, quickAddTag, quickAddManufacturer
  };
};
