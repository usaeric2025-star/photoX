import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFeedback, useAdminMode, useTasks, useTaskExecutor } from '@/hooks';
import { backfillThumbHashes } from '@/services/photo/backfillService';
import { toast } from 'sonner';
import { FullPageLoading } from '@/components/FullPageLoading';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AdminGlobalModals } from '@/components/admin/AdminGlobalModals';
import { BatchEditScreen } from '@/components/admin/BatchEditScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { PhotoEditDrawer } from '@/components/admin/PhotoEditDrawer';
import { GroupDetailView } from '@/components/GroupDetailView';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LoginScreen } from '@/components/admin/LoginScreen';
import { MainAdminScreen } from './MainAdminScreen';
import { PublicGallery } from '@/components/public/PublicGallery';
import { useGalleryStore } from '@/store';
import { useAdminViewLogic } from './useAdminViewLogic';
import { useAdminActions } from './useAdminActions';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { User, Photo } from '@/types';
import { TranslationType } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';

/* Removed ErrorFallback component */

interface Props {
  user: User | null;
  authChecked: boolean;
  logout: () => void;
  t: TranslationType;
  lang: LanguageCode;
  sessionValue: any;
  photoValue: any;
  uiValue: any;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
}

export const AdminViewContent: React.FC<Props> = ({ 
  user, authChecked, t, lang, sessionValue, photoValue, uiValue, hasNextPage, isFetchingNextPage, isLoading 
}) => {
  console.log('AdminView render', { isLoading });
  const { showError, showSuccess } = useFeedback();
  const isAdminMode = useAdminMode();
  const { runTask } = useTaskExecutor();
  const setAlertDialog = useGalleryStore(s => s.setAlertDialog);

  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
  const [showImmediateLoading, setShowImmediateLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowImmediateLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const handleRunMaintenance = useCallback(async () => {
    if (isMaintenanceRunning) return;
    setIsMaintenanceRunning(true);
    await runTask('自动修复缩略图 / Auto Repair ThumbHashes', async ({ updateProgress }) => {
        const { supabase } = await import('@/services/supabaseService');
        updateProgress(15, '正在分析未生成缩略图占位项目的数量...');
        // First check if there are any missing thumb hashes to avoid needless backfilling
        const { data: missingHashes, error: countError } = await supabase
           .from('furniture_items')
           .select('id')
           .is('thumb_hash', null);
        
        if (countError) throw countError;
        
        if (!missingHashes || missingHashes.length === 0) {
            updateProgress(100, '完美分析完成，没有缺失占位图的照片。');
            return { skipped: true };
        }

        updateProgress(40, `正在为 ${missingHashes.length} 项商品自动回填修复...`);
        await backfillThumbHashes((stats) => {
            const progressPct = 40 + (stats.processed / stats.total) * 60;
            updateProgress(
                progressPct,
                `正在修复: ${stats.processed}/${stats.total} (成功: ${stats.success}, 失败: ${stats.failed})`
            );
        });
        return { skipped: false };
    }, {
        onSuccess: (res) => {
            if (res?.skipped) {
                toast.success('诊断完成：所有照片缩略图高度一致，无需修复！ (已跳过已完善项目)');
            } else {
                showSuccess('缩略图自动修复完成');
            }
        },
        onError: (e) => {
            showError(e, '修复失败，已停止');
        },
        showSuccessToast: false,
        showErrorToast: true
    });
    setIsMaintenanceRunning(false);
  }, [runTask, showError, showSuccess, isMaintenanceRunning]);
  const logic = useAdminViewLogic({
    user, sessionValue, photoValue, uiValue,
    onRefresh: sessionValue.onRefresh,
    performPullSync: sessionValue.performPullSync,
    hasNextPage,
    isFetchingNextPage
  });

  const editingPhotoId = useGalleryStore((s) => s.editingPhotoId);
  const setEditingPhotoId = useGalleryStore((s) => s.setEditingPhotoId);

  useEffect(() => {
    if (editingPhotoId) {
      logic.setEditPhotoId(editingPhotoId);
      setEditingPhotoId(null);
    }
  }, [editingPhotoId, setEditingPhotoId, logic]);

  const actions = useAdminActions(logic);
  const { tasks, cancelTask } = useTasks();
  const { reset, clear } = useMultiSelect();

  // Reset multi select on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('scrollPosition', String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 恢复滚动位置
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('scrollPosition');
    if (savedPosition) {
      window.scrollTo({ top: parseInt(savedPosition), behavior: 'auto' });
    }
  }, []);

  const handleExitPublic = useCallback(() => {
    reset();
    tasks.filter(t => t.status === 'running').forEach(t => cancelTask(t.id));
    logic.setAdminPreviewMode('private');
  }, [logic, tasks, cancelTask, reset]);

  const handleRefreshPublic = useCallback(() => {
    if (logic.checkSyncLock()) return;
    logic.performPullSync(true);
  }, [logic]);

  const lastSyncTime = localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime')!).getTime() : null;
  const hasLoadedOnce = useGalleryStore((s) => s.hasLoadedOnce);

  const isActuallyLoading = showImmediateLoading || isLoading;
  if (isActuallyLoading) {
    return <FullPageLoading />;
  }

  if (authChecked && !user) {
    return <LoginScreen loginWithGoogle={sessionValue.loginWithGoogle} isLoading={sessionValue.loadingType === 'auth'} />;
  }

  return <pre style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
    {JSON.stringify({
      photos: logic.photos?.length,
      categories: logic.categories?.length,
      settings: !!logic.settings,
      hasLoadedOnce,
      error: 'infiniteQuery not directly exposed',
    }, null, 2)}
  </pre>;
};
