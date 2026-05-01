import React, { useState, useCallback } from 'react';
import { 
  saveSettings as saveSettingsCloud, 
  syncPhotosToCloud as syncPhotosToCloudService,
  updatePhotosGroupInCloud,
  supabase
} from '../services/supabaseService';
import { deleteGroupFromCloud } from '../services/groupService';
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

  const { settings, setSettings = () => {} } = adminSession || {};
  const { setAlertDialog = () => {}, setCloudCount = () => {}, showToast = () => {} } = adminUI || {};

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
            showToast(`保存设置失败: ${err.message}`, 'error');
          });
        }, 0);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`保存数据失败: ${err.message}`, 'error');
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
        
        showToast(resultMessage, 'success');

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

        if (result.modelNumber && (!formState.model_number || !formState.model_number.trim())) updates.model_number = result.modelNumber;
        if (result.manualCode && (!formState.manual_code || !formState.manual_code.trim())) updates.manual_code = result.manualCode;
        if (result.description && (!formState.description || !formState.description.trim())) updates.description = result.description;
        
        if (result.description_translations) {
          updates.description_translations = result.description_translations;
        }
        
        updateFormFn(updates);
        
        showToast('AI 已帮您自动填入数据。', 'success');
      } else {
        showToast('未能从图片分析出有效数据。', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`AI 识别失败: ${err.message || '请检查网络或 API 密钥'}`, 'error');
    }
  }, [setAlertDialog, categories, tags]);

  const performPushSync = useCallback(async () => {
    if (!user) return;
    const run = adminUI?.withLoading ? adminUI.withLoading.bind(null, 'syncing') : async (fn: any) => fn();
    await run(async () => {
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
        
        showToast(`${t.pushSuccess}: ${t.pushSuccessMsg(result.skipped)}`, 'success');
      } catch (err: any) {
        showToast(`${t.pushFail}: ${err.message}`, 'error');
      }
    });
  }, [user, photos, settings, categories, tags, manufacturers, setAlertDialog, t, refreshCloudData, setCloudCount, lastSyncTime, adminUI]);

  const performPullSync = useCallback(async () => {
    const run = adminUI?.withLoading ? adminUI.withLoading.bind(null, 'syncing') : async (fn: any) => fn();
    await run(async () => {
      try {
        await refreshCloudData(user, true, setCloudCount);
        showToast(`${t.pullSuccess}: ${t.pullSuccessMsg}`, 'success');
      } catch (err: any) {
        showToast(`${t.pullFail}: ${err.message}`, 'error');
      }
    });
  }, [user, setAlertDialog, t, refreshCloudData, setCloudCount, adminUI]);

  const handleUngroup = useCallback(async (groupId: string) => {
      try {
        const photosToUngroup = photos.filter(p => p.groupId === groupId);
        const photoIds = photosToUngroup.map(p => p.id);
        
        // 1. Update photos to remove groupId and group-specific markers
        if (photoIds.length > 0) {
          await updatePhotosGroupInCloud(photoIds, { 
            group_id: null, 
            is_pinned: false,
            is_group_cover: false,
            group_order: 0
          });
          setPhotos(prev => prev.map(p => p.groupId === groupId ? { 
            ...p, 
            groupId: null, 
            isPinned: false,
            isGroupCover: false,
            groupOrder: 0
          } : p));
        }

        // 2. Delete group metadata permanently
        try {
          await deleteGroupFromCloud(groupId);
        } catch (e) {
          console.warn("Failed to delete group metadata (might be already deleted or table missing):", e);
        }

        showToast('解除群組成功 / Group Disbanded', 'success');
      } catch (err: any) {
        console.error('Ungroup error:', err);
        showToast(`解除群組失敗: ${err?.message || '未知錯誤'}`, 'error');
        throw err; // Re-throw to prevent UI from closing/navigating
      }
  }, [photos, setPhotos, setAlertDialog, showToast]);

  const handleGroupPhotos = useCallback(async (ids: string[]) => {
    if (ids.length < 2) return;
    
    const existingGroupIds: string[] = Array.from(new Set(
      photos.filter(p => ids.includes(p.id) && p.groupId).map(p => p.groupId as string)
    ));
    
    const groupIdToUse = existingGroupIds.length > 0 ? existingGroupIds[0]! : crypto.randomUUID();
    
    const allPhotosToGroup = photos.filter(p => 
      ids.includes(p.id) || (p.groupId && existingGroupIds.includes(p.groupId))
    );
    
    const photoIdsToUpdate = allPhotosToGroup.map(p => p.id);
    
    const updatedPhotos = photos.map(p => photoIdsToUpdate.includes(p.id) ? { ...p, groupId: groupIdToUse } : p);
    setPhotos(updatedPhotos);
    try {
      await updatePhotosGroupInCloud(photoIdsToUpdate, { group_id: groupIdToUse });
    } catch (err: any) {
      console.error('Group photos error:', err);
      showToast(`群組失敗: ${err?.message || '未知錯誤'}`, 'error');
    }
  }, [photos, setPhotos, setAlertDialog]);

  return {
    saveSettings,
    performPushSync, performPullSync,
    handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos
  };
};

