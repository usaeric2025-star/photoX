import React, { useState, useEffect } from 'react';
import { AdminGridContainer } from '@/components/photo/AdminGridContainer';
import { 
  useMultiSelect, 
  useAuth, 
  useTasks, 
  useSyncMutation, 
  useAdminMode,
  useSettings,
  useCategories,
  useTags,
  useManufacturers,
  useTaskExecutor,
  useErrorHandler
} from '@/hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { toast } from 'sonner';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { translations } from '@/lib/translations';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';

import { useAIBatchAnalysis } from '@/hooks/useAIBatchAnalysis';
export function AdminScreen() {
  const { user } = useAuth();
  const { photos, isLoading: isLoadingPhotos } = usePhotoGallery();
  const { tasks } = useTasks();
  const isSyncing = tasks.some(t => t.name.includes('同步') && t.status === 'running');
  
  const lang = useUIStore((s) => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const { handleBatchAiAnalyze: onBatchAiAnalyze } = useAIBatchAnalysis();

  const variant = user ? 'full-management' : 'staff-workspace';
  
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative" id="main-admin-screen">
       <div className="flex-1 min-h-0 relative">
          {photos.length === 0 && !isLoadingPhotos ? (
           <AdminEmptyState t={t} />
         ) : (
           <AdminGridContainer 
              onBatchAiAnalyze={onBatchAiAnalyze}
             variant={variant}
             handleBatchAiIdentifyTrigger={async () => {
                onBatchAiAnalyze(photos);
             }}
           />
         )}
       </div>
    </div>
  );
}
