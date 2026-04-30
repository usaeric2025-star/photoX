import React, { useState, useCallback } from 'react';
import { 
  saveSettings as saveSettingsCloud, 
  syncPhotosToCloud as syncPhotosToCloudService,
  updatePhotosGroupInCloud,
  supabase
} from '../services/supabaseService';
import { updatePhotoInCloud } from '../services/photoService';
import { saveData } from '../utils/indexedDB';

import { useGalleryContext } from '../context/GalleryContext';

export const useAdminCore = (
  user: any,
  updateForm: Function,
  t: any,
  refreshCloudData: Function,
  lastSyncTime?: number | null,
  adminUI?: any,
  adminSession?: any
) => {
  const {
    photos, setPhotos,
    categories, tags, manufacturers
  } = useGalleryContext();

  const { settings, setSettings = () => {}, setIsSyncing = () => {} } = adminSession || {};
  const { setAlertDialog = () => {}, setCloudCount = () => {}, showToast = () => {}, setConfirmDialog = () => {} } = adminUI || {};

  const showLoadingToast = useCallback((message: string) => {
    return showToast(message, 'loading', true);
  }, [showToast]);

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
        const catNameStr = categories.find(c => String(c.id) === String(result.categoryId))?.zh || result.newCategoryName || '未识别';
        const tagNamesStr = [
            ...(result.tagIds || []).map((id: string) => tags.find(t => String(t.id) === String(id))?.name).filter(Boolean),
            ...(result.newTags || [])
        ];
        const resultMessage = `✅ AI 识别完成\n\n名称：${result.name || '未识别'}\n分类：${catNameStr}\n标签：${tagNamesStr.join(', ') || '无'}`;
        
        setAlertDialog({ title: 'AI 识别结果 / AI Analysis Result', message: resultMessage });

        const updates: Partial<any> = {};
        // Placeholder for shouldUpdateName logic - kept for simplicity
        if (result.name) {
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
          } else if (typeof result.dimensions === 'object') {
              updates.dimensions = [result.dimensions];
          }
        }

        if (result.modelNumber && !formState.model_number) updates.model_number = result.modelNumber;
        if (result.manualCode && !formState.manual_code) updates.manual_code = result.manualCode;
        if (result.description && !formState.description) updates.description = result.description;
        
        updateFormFn(updates);
        
        setAlertDialog({ title: 'AI 分析结果', message: 'AI 已帮您自动填入数据。' });
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
      await saveData('last_sync_time', Date.now());
      refreshCloudData(user, false, setCloudCount);
      
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
    setConfirmDialog({
      message: '确定要解散这个群组吗？',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        const closeLoading = showLoadingToast('正在解散群组...');
        try {
          const photosToUngroup = photos.filter(p => p.groupId === groupId);
          const photoIds = photosToUngroup.map(p => p.id);
          
          if (photoIds.length > 0) {
            await updatePhotosGroupInCloud(photoIds, null);
            await Promise.all(photoIds.map(id => updatePhotoInCloud(id, { is_pinned: false })));
            setPhotos(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null, isPinned: false } : p));
          }
          closeLoading();
          showToast('解除群组成功');
        } catch (err: any) {
          closeLoading();
          console.error('Ungroup error:', err);
          setAlertDialog({ title: '解除群組失敗', message: err?.message || '未知錯誤' });
        }
      }
    });
  }, [photos, setPhotos, setAlertDialog, updatePhotoInCloud, setConfirmDialog, showLoadingToast, showToast]);

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
    } catch (err: any) {
      console.error('Group photos error:', err);
      setAlertDialog({ title: '群組失敗', message: err?.message || '未知錯誤' });
    }
  }, [photos, setPhotos, setAlertDialog]);

  return {
    saveSettings,
    performPushSync, performPullSync,
    handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos,
    showLoadingToast
  };
};

