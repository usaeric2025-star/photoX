import React from 'react';
import { AdminGridContainer } from '@/components/photo/AdminGridContainer';
import { 
  useAuth, 
  useTasks, 
} from '@/hooks';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { useUIStore } from '@/store/useUIStore';
import { translations } from '@/lib/translations';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';

export function AdminContainer() {
  const { user } = useAuth();
  const { photos, isLoading: isLoadingPhotos } = usePhotoGallery();
  const { tasks } = useTasks();
  
  const lang = useUIStore((s) => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative" id="main-admin-screen">
       <div className="flex-1 min-h-0 relative">
          {photos.length === 0 && !isLoadingPhotos ? (
           <AdminEmptyState t={t} />
         ) : (
           <AdminGridContainer />
         )}
       </div>
    </div>
  );
}
