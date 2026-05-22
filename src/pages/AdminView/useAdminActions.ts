import { useCallback } from 'react';
import { Photo } from '@/types';
import { useFeedback } from '@/hooks';
import { uploadLogo } from '@/services/settingService';
import { useGalleryStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiSelect } from '@/hooks/useMultiSelect';

export const useAdminActions = (logic: any) => {
  const { showSuccess, handleError } = useFeedback();
  const queryClient = useQueryClient();
  const { disable } = useMultiSelect();

  const handleLoadMoreCallback = useCallback(() => {
    if (logic.hasNextPage && !logic.isFetchingNextPage) {
       logic.performPullSync(true);
    }
  }, [logic]);

  const handleManageClick = useCallback(() => logic.setActiveScreen('manage'), [logic.setActiveScreen]);
  
  const handleRefresh = useCallback(() => {
    if (logic.checkSyncLock()) return;
    
    // 1. 清空临时状态
    useGalleryStore.getState().setSearchQuery('');
    useGalleryStore.getState().setDebouncedSearchQuery('');
    useGalleryStore.getState().setFilterCatId(null);
    useGalleryStore.getState().setFilterTagIds([]);
    disable();
    
    // 2. 清除持久化的筛选
    sessionStorage.removeItem('photo-filters');
    localStorage.removeItem('photo-filters');
    
    // 3. 重置 React Query 缓存
    queryClient.resetQueries({ queryKey: ['photos'] });
    queryClient.resetQueries({ queryKey: ['photos', 'infinite'] });
    
    // 4. 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    logic.performPullSync(true);
    showSuccess('已重置所有筛选');
  }, [logic, showSuccess, queryClient]);

  const handleToggleHidden = useCallback(async (photo: Photo) => {
    if (logic.checkSyncLock()) {
      handleError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
      return;
    }
    try {
      await logic.toggleHidden(photo);
      showSuccess('已更新隐藏状态');
    } catch (e) {
      handleError(e, '更新失败');
    }
  }, [logic, showSuccess, handleError]);

  const handleBatchToggleHidden = useCallback(async (ids: string[]) => {
    if (logic.checkSyncLock()) {
      handleError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
      return;
    }
    const targetPhotos = logic.photos.filter((p: any) => ids.includes(p.id));
    const allHidden = targetPhotos.every((p: any) => p.is_hidden);
    await logic.updatePhotosBulk(ids, { is_hidden: !allHidden }, '批量更新隐藏状态');
    disable();
  }, [logic, disable, handleError]);

  const handleEditPhoto = useCallback((id: string) => logic.onEditPhotoById(id), [logic]);

  const handleDeletePhotos = useCallback((ids: string[]) => {
      if (logic.checkSyncLock()) {
        handleError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
        return;
      }
      logic.handleDeletePhoto(ids);
      disable();
  }, [logic, disable, handleError]);

  const handleGroupPhotos = useCallback(async (ids: string[]) => {
      if (logic.checkSyncLock()) {
        handleError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
        return;
      }
      try {
        await logic.handleGroupPhotos(ids);
        disable();
      } catch (e: any) {
        handleError(e, '合组失败');
      }
  }, [logic, handleError, disable]);

  const handleBatchEdit = useCallback((ids: string[]) => {
      if (logic.checkSyncLock()) {
        handleError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
        return;
      }
      logic.setBatchEditIds(ids);
  }, [logic, handleError]);

  const handleUngroup = useCallback(async (groupId: string) => { 
    if (logic.checkSyncLock()) return;
    try {
      await logic.handleUngroup(groupId); 
    } catch (e: any) {
      handleError(e, '拆组失败');
    }
  }, [logic, handleError]);

  const handleBatchAiAnalyze = useCallback((photos: Photo[]) => {
    logic.setAlertDialog({
      title: 'AI 群组智能识别 / Group AI Identify',
      message: `请选择对这 ${photos.length} 张照片进行群组识别的模式：\n\n•「跳过已完善」：仅分析未完成或缺属性的照片，避免重复工作和额外额度开销（推荐）\n•「分析全部」：重新分析并同步特征至该群组的所有照片`,
      cancelLabel: '取消 / Cancel',
      confirmLabel: '分析全部 / Analyze All',
      onConfirm: async () => {
         try {
           await logic.withLoading('analyzing', () => logic.handleGroupAiIdentify(photos, true));
         } catch (e: any) {
           handleError(e, '识别失败');
         }
      },
      secondaryAction: {
         label: '跳过已完善 / Skip Completed',
         onClick: async () => {
            try {
              await logic.withLoading('analyzing', () => logic.handleGroupAiIdentify(photos, false));
            } catch (e: any) {
              handleError(e, '识别失败');
            }
         }
      }
    });
  }, [logic, handleError]);

  const handleAiAnalyze = useCallback((p: Photo) => {
    return logic.handleSingleAiAnalyze(p.uri || p.image_url, p.category_id || undefined, p.id)
      .catch((e: Error) => handleError(e, '识别失败'));
  }, [logic, handleError]);

  const handleUpdatePhoto = useCallback(async (id: string, updates: any) => {
    if (logic.checkSyncLock()) return;
    try {
      await logic.updatePhoto(id, updates);
    } catch (e: any) {
      handleError(e, '更新照片属性失败');
    }
  }, [logic, handleError]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (logic.checkSyncLock()) return;
    const file = e.target.files?.[0];
    if (!file) return;

    await logic.withLoading('global', async () => {
      try {
        const url = await uploadLogo(file);
        if (url && logic.settings) {
          const newSettings = { ...logic.settings, logo_url: url };
          await logic.saveSettings(newSettings);
          showSuccess('Logo 更新成功！');
        }
      } catch (err: any) {
        handleError(err, 'Logo 上传失败');
      }
    });
  }, [logic, showSuccess, handleError]);

  const handlePerformPushSync = useCallback(async () => { 
    try {
      await logic.withLoading('sync-push', async () => { 
        await logic.performPushSync(true); 
      }); 
      showSuccess('成功备份至云端！');
      return { success: true, data: null }; 
    } catch (err: any) {
      handleError(err, '同步备份失败');
      throw err;
    }
  }, [logic, showSuccess, handleError]);

  const handlePerformPullSync = useCallback(async () => { 
    try {
      await logic.performPullSync(true); 
      showSuccess('成功自云端恢复！');
      return { success: true, data: null }; 
    } catch (err: any) {
      handleError(err, '云端恢复失败');
      throw err;
    }
  }, [logic, showSuccess, handleError]);

  const handleSaveNewPhoto = useCallback(async () => {
    if (logic.checkSyncLock()) return;
    try {
      await logic.saveNewPhoto();
      showSuccess('照片已保存');
    } catch (e) {
      handleError(e, '保存照片失败');
    }
  }, [logic, showSuccess, handleError]);

  const handleImport = useCallback(() => {
    if (logic.checkSyncLock()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => logic.handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false).catch((err: Error) => handleError(err, '导入图片失败'));
    input.click();
  }, [logic, handleError]);

  return {
    handleLoadMoreCallback, handleManageClick, handleRefresh, handleToggleHidden,
    handleBatchToggleHidden, handleEditPhoto, handleDeletePhotos, handleGroupPhotos,
    handleBatchEdit, handleUngroup, handleBatchAiAnalyze, handleAiAnalyze,
    handleUpdatePhoto, handleLogoUpload, handlePerformPushSync, handlePerformPullSync,
    handleSaveNewPhoto, handleImport
  };
};
