
import React, { useState, useCallback } from 'react';
import { saveSettings as saveSettingsCloud, syncPhotosToCloud as syncPhotosToCloudService } from '../services/supabaseService';
import { saveData } from '../utils/indexedDB';
import { translations, LanguageCode } from '../lib/translations';

export const useAdminViewActions = (
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
  t: any,
  refreshCloudData: Function
) => {

  const saveSettings = useCallback(async (s: any) => {
    try {
      setSettings(s);
      await saveData('product_settings', s);
      if (user) {
        const { categories: cats, tags: tg, manufacturers: mfrs } = s;
        setTimeout(() => {
          saveSettingsCloud({
            ...s,
            categories: cats || categories,
            tags: tg || tags,
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
    dbCategories?: any[], 
    updateForm?: any,
    handleSingleAiAnalyzeService?: any
  ) => {
    if(!handleSingleAiAnalyzeService) return;
    try {
      const result = await handleSingleAiAnalyzeService(data, catId, editPhotoId);
      if (result) {
        console.log('AI Analysis Result:', result);
        console.log('Form State Name:', formState.name);
        
        const updates: Partial<any> = {};
        if (result.name && (formState.name === '未命名产品' || formState.name === 'Furniture' || !formState.name)) {
          console.log('Setting name to:', result.name);
          updates.name = result.name;
        }
        
        if (result.categoryId && !catId && !formState.categoryId) {
          updates.categoryId = result.categoryId;
        } else if (result.newCategoryName && !catId && !formState.categoryId) {
          const foundCat = dbCategories?.find(c => c.zh === result.newCategoryName || c.en === result.newCategoryName);
          if (foundCat) updates.categoryId = foundCat.code;
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

        if (result.modelNumber && !formState.model_number) {
          updates.model_number = result.modelNumber;
        }
        
        if (result.manualCode && !formState.manual_code) {
          updates.manual_code = result.manualCode;
        }
        
        if (result.description && !formState.description) {
          updates.description = result.description;
        }
        
        updateForm(updates);
        
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
        tags,
        manufacturers
      });
      const result = await syncPhotosToCloudService(user.id, photos, (p: number) => {}); // Placeholder setSyncPercent
      setAlertDialog({ 
        title: t.pushSuccess, 
        message: t.pushSuccessMsg(result.skipped) 
      });
    } catch (err: any) {
      setAlertDialog({ title: t.pushFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, photos, settings, categories, tags, manufacturers, setIsSyncing, setAlertDialog, t]);

  const performPullSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refreshCloudData(
        user, categories, tags, manufacturers, setSettings, 
        (v:any)=>v, (v:any)=>v, (v:any)=>v, (v:any)=>v, setCategories, setTags, setManufacturers, setPhotos, (v:any)=>v, true
      );
      setAlertDialog({ title: t.pullSuccess, message: t.pullSuccessMsg });
    } catch (err: any) {
      setAlertDialog({ title: t.pullFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  }, [user, categories, tags, manufacturers, setSettings, setCategories, setTags, setManufacturers, setPhotos, setIsSyncing, setAlertDialog, t, refreshCloudData]);

  return { saveSettings, performPushSync, performPullSync, handleSingleAiAnalyzeCallback };
};
