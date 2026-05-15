import { useDelete } from './useDelete';
import React, { useState, useCallback } from 'react';
import { Photo, User, AppSettings, ProductFormData } from '../types';
import { safeArray } from '../lib/utils';
import { 
  saveSettings as saveSettingsCloud, 
  syncPhotosToCloud as syncPhotosToCloudService,
  updatePhotosGroupInCloud,
  supabase
} from '../services/supabaseService';
import { saveData } from '../utils/indexedDB';

import { useGallery } from './useGallery';

export const useAdminCore = (user: User | null) => {
  const { deleteGroup } = useDelete();
  const { photos, setPhotos, categories, manufacturers } = useGallery();

  const saveSettings = useCallback(async (s: AppSettings) => {
    try {
      await saveData('product_settings', s);
      if (user) {
        const { categories: cats, manufacturers: mfrs } = s as any; // categories and manufacturers might be in s depending on usage
        await saveSettingsCloud({
          ...s,
          categories: cats || categories,
          manufacturers: mfrs || manufacturers
        });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [user, categories, manufacturers]);

  const handleSingleAiAnalyzeCallback = async (
    data: string, 
    catId?: string, 
    editPhotoId?: string, 
    formState?: ProductFormData, 
    updateFormFn?: (updates: Partial<ProductFormData>) => void,
    handleSingleAiAnalyzeService?: (data: string, catId?: string, editPhotoId?: string | null) => Promise<any>
  ) => {
    if(!handleSingleAiAnalyzeService || !updateFormFn || !formState) return { success: false, error: 'No service' };
    try {
      const result = await handleSingleAiAnalyzeService(data, catId, editPhotoId || null);
      if (result) {
        const updates: Partial<ProductFormData> = {};
        if (result.name) updates.name = result.name;
        
        if (result.categoryId && !catId && !formState.categoryId) {
          updates.categoryId = result.categoryId;
        } else if (result.newCategoryName && !catId && !formState.categoryId) {
          const foundCat = safeArray(categories).find(c => c.zh === result.newCategoryName || c.en === result.newCategoryName || c.name === result.newCategoryName);
          if (foundCat) updates.categoryId = foundCat.id;
        }

        if (result.tagIds) {
          const sTagIds = safeArray(result.tagIds);
          updates.tagIds = sTagIds.length > 0 ? sTagIds : (typeof result.tagIds === 'string' ? [result.tagIds] : []);
        }
        
        if (result.dimensions) {
          const sDims = safeArray(result.dimensions);
          updates.dimensions = sDims.length > 0 ? sDims : [result.dimensions];
        }
        
        if (result.modelNumber && (!formState.model_number || !formState.model_number.trim())) updates.model_number = result.modelNumber;
        if (result.manualCode && (!formState.manual_code || !formState.manual_code.trim())) updates.manual_code = result.manualCode;
        if (result.description && (!formState.description || !formState.description.trim())) updates.description = result.description;
        
        if (result.description_translations) updates.description_translations = result.description_translations;
        
        updateFormFn(updates);
        return { success: true, data: result };
      }
      return { success: false, error: '未能分析' };
    } catch (err) {
      return { success: false, error: err };
    }
  };


  const performPushSync = useCallback(async (settings: AppSettings, refreshCloudData: (user: User | null, force?: boolean) => Promise<void>, lastSyncTime?: number | null) => {
    if (!user) return { success: false, error: 'No user' };
    try {
      await saveSettingsCloud({...settings, categories, manufacturers});
      const lastSyncISO = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
      const result = await syncPhotosToCloudService(user.id, photos, lastSyncISO);
      const now = new Date().toISOString();
      localStorage.setItem('lastSyncTime', now);
      await saveData('last_sync_time', Date.now());
      await refreshCloudData(user, false);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [user, photos, categories, manufacturers]);

  const performPullSync = useCallback(async (refreshCloudData: (user: User | null, force?: boolean) => Promise<void>) => {
    try {
      await refreshCloudData(user, true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [user]);

  const handleUngroup = useCallback(async (groupId: string) => {
    return await deleteGroup(groupId);
  }, [deleteGroup]);

  const handleGroupPhotos = useCallback(async (ids: string[]) => {
    const sIds = safeArray(ids);
    const sPhotos = safeArray(photos);
    if (sIds.length < 2) return { success: false, error: 'Too few photos' };
    
    const existingGroupIds: string[] = Array.from(new Set(
      sPhotos.filter(p => sIds.includes(p.id) && p.groupId).map(p => p.groupId as string)
    ));
    const sExistingGroupIds = safeArray(existingGroupIds);
    const groupIdToUse = sExistingGroupIds.length > 0 ? sExistingGroupIds[0]! : crypto.randomUUID();
    const photoIdsToUpdate = sPhotos.filter(p => sIds.includes(p.id) || (p.groupId && sExistingGroupIds.includes(p.groupId))).map(p => p.id);
    
    const sPhotoIdsToUpdate = safeArray(photoIdsToUpdate);
    const updatedPhotos = sPhotos.map(p => sPhotoIdsToUpdate.includes(p.id) ? { ...p, groupId: groupIdToUse } : p);
    setPhotos(updatedPhotos);
    try {
      await updatePhotosGroupInCloud(sPhotoIdsToUpdate, { group_id: groupIdToUse });
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [photos, setPhotos]);


  return {
    saveSettings,
    performPushSync, performPullSync,
    handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos
  };
};

