import React, { useState, useCallback } from 'react';

export const useAdminViewLogic = (
  photos: any[],
  setPhotos: React.Dispatch<React.SetStateAction<any[]>>,
  settings: any,
  saveSettings: Function,
  categories: any[],
  setCategories: React.Dispatch<React.SetStateAction<any[]>>,
  tags: any[],
  setTags: React.Dispatch<React.SetStateAction<any[]>>,
  manufacturers: any[],
  setManufacturers: React.Dispatch<React.SetStateAction<any[]>>,
  updateForm: Function,
  setAlertDialog: Function,
  setPromptDialog: Function
) => {
  const [activeScreen, setActiveScreen] = useState('home');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleUngroup = useCallback((groupId: string) => {
    setPhotos(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null } : p));
  }, [setPhotos]);

  const handleGroupPhotos = useCallback(async (ids: string[], user: any, savePhotoToCloud: Function) => {
    if (ids.length < 2) return;
    const groupId = `group-${Date.now()}`;
    const updatedPhotos = photos.map(p => ids.includes(p.id) ? { ...p, groupId } : p);
    setPhotos(updatedPhotos);
    
    // Simplification for migration: assume saving logic is handled elsewhere or via utility
    // If saving needs to be here, it needs to import savePhotoToCloud or use a shared service
  }, [photos, setPhotos]);

  const quickAddSubCategory = useCallback((formState: any) => {
    if (!formState.categoryId) return;
    setPromptDialog({
      title: '新增子分类',
      placeholder: '输入新子分类名称',
      onSubmit: async (val: string) => {
        const newSubId = crypto.randomUUID();
        const nextCats = categories.map(c => c.id === formState.categoryId ? {
          ...c,
          subcategories: [...c.subcategories, { id: newSubId, name: val.trim(), aliases: [] }]
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
        const newTagId = crypto.randomUUID();
        const nextTags = [...tags, { id: newTagId, name: trimmedName, aliases: [] }];
        setTags(nextTags);
        updateForm((prev: any) => ({ ...prev, tagIds: [...prev.tagIds, newTagId] }));
        await saveSettings({ ...settings, categories, tags: nextTags, manufacturers });
      }
    });
  }, [tags, categories, manufacturers, settings, saveSettings, setTags, updateForm, setAlertDialog, setPromptDialog]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const newMfrId = crypto.randomUUID();
        const nextMfrs = [...manufacturers, { id: newMfrId, name: val.trim(), aliases: [] }];
        setManufacturers(nextMfrs);
        updateForm((prev: any) => ({ ...prev, subcategoryId: newMfrId }));
        await saveSettings({ ...settings, categories, tags, manufacturers: nextMfrs });
      }
    });
  }, [manufacturers, categories, tags, settings, saveSettings, setManufacturers, updateForm, setPromptDialog]);

  return {
    activeScreen, setActiveScreen,
    toast, showToast,
    handleUngroup,
    handleGroupPhotos,
    quickAddSubCategory,
    quickAddTag,
    quickAddManufacturer
  };
};
