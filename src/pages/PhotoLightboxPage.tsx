import React from "react";
import { Info, Tag as TagIcon, Grid } from "lucide-react";
import { ReelkitAdapter } from "@/components/lightbox/ReelkitAdapter";
import { useLightbox } from "@/hooks";
import { PhotoInfoPanel } from "@/components/photo/PhotoInfoPanel";
import { useUIStore } from "@/store/useUIStore";
import { useAdminMaintenance } from "@/hooks/admin/useAdminMaintenance";
import { useTags, useCategories, useTranslation } from "@/hooks";
import { useGroupCoverMutation } from "@/hooks";
import { getTranslatedCategoryName } from "@/services/category/utils";
import { translations } from "@/locales";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from '@/lib/ui/toast';
import { getSafeText } from "@/services/ai/safeText";

import { LightboxFloatingInfo } from "@/components/lightbox/LightboxFloatingInfo";
import { LightboxFloatingActions } from "@/components/lightbox/LightboxFloatingActions";

/**
 * [PAGE] PhotoLightboxPage
 * Global entry point for the photo lightbox. 
 * Mounted at the root to ensure isolation from virtual scrolls.
 */
export const PhotoLightboxPage = () => {
  const { 
    isOpen, close, photos, currentIndex, setPhotoId,
    mode, data, showEdit, showDelete, showAi, isLoading, groupId, totalCount
  } = useLightbox();

  const pendingPhotoIdRef = React.useRef<string | null>(null);
  const debounceTimerRef = React.useRef<any>(null);

  const setPhotoIdDebounced = React.useCallback((id: string) => {
    pendingPhotoIdRef.current = id;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (pendingPhotoIdRef.current) {
        setPhotoId(pendingPhotoIdRef.current);
        pendingPhotoIdRef.current = null;
      }
    }, 200);
  }, [setPhotoId]);

  const closeWithCleanup = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    pendingPhotoIdRef.current = null;
    close();
  }, [close]);

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const updateUIStore = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);
  const adminActions = useAdminMaintenance();
  const { mutateAsync: setCoverMut } = useGroupCoverMutation();
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null;

  const handleSetCover = async (photo: any) => {
    if (!groupId) return;
    try {
      await setCoverMut({ groupId, photoId: photo.id });
      const displayName = getSafeText(photo.name, appLang);
      showToast.success(displayName ? `已将 "${displayName}" 设为封面` : '封面设置成功');
    } catch (e) {
      showToast.error('设置封面失败');
    }
  };
  const [showInfo, setShowInfo] = React.useState(false);
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  
  const { data: tags = [] } = useTags();
  const { data: categories = [] } = useCategories();
  
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);

  if (!isOpen || editPhotoId || newPhotoData) return null;

  // [OPTIMIZATION] Directly show the frame if we have photos from list cache
  // This allows the lightbox to show the cached thumbnail while the detail loads
  if (photos.length === 0 && isLoading) {
    return <LightboxLoadingFallback />;
  }
  
  // If we have a photoId but no photos (e.g. invalid ID or deleted)
  if (photos.length === 0 && !isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-white font-medium">照片不存在或已删除 / Photo not found</p>
          <button 
            onClick={close}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            返回 / Close
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = async () => {
    if (currentPhoto) {
      const id = currentPhoto.id;
      await close(); 
      setTimeout(() => {
        updateUIStore({ editPhotoId: id });
      }, 300);
    }
  };

  const handleDelete = () => deleteDialog.open();

  const handleAiAnalyze = async () => {
    if (currentPhoto) {
      const id = currentPhoto.id;
      await close();
      setTimeout(() => {
        updateUIStore({ editPhotoId: id });
      }, 300);
    }
  };
  
  const currentPhotoDisplayName = currentPhoto ? (typeof currentPhoto.name === 'object' ? (currentPhoto.name[appLang as keyof typeof currentPhoto.name] || currentPhoto.name.zh) : currentPhoto.name) : '';

  const renderSidebar = () => 
    showInfo && currentPhoto ? (
      <>
        <div 
          className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300"
          onClick={() => setShowInfo(false)}
        />
        <div className="absolute right-0 top-0 h-full w-full md:w-[420px] pointer-events-none flex items-center z-50 p-0 sm:p-4">
          <PhotoInfoPanel 
            data={data}
            mode={mode as 'single' | 'group'}
            showEdit={showEdit}
            showDelete={showDelete}
            showAi={showAi}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAiAnalyze={handleAiAnalyze}
            onClose={() => setShowInfo(false)}
            className="pointer-events-auto w-full h-full shadow-2xl rounded-none sm:rounded-2xl border-l border-white/10 bg-white animate-in slide-in-from-right duration-500 ease-out"
            headerClassName="md:pl-4 pl-4"
          />
        </div>
      </>
    ) : null;

  const renderFloatingButton = () => {
    if (!currentPhoto) return null;
    
    let displayCategoryName = '';
    if (currentPhoto.category_id) {
      displayCategoryName = getTranslatedCategoryName(currentPhoto.category_id, categories, appLang, translations[appLang]);
    }
    
    let displayTagNames: string[] = [];
    if (Array.isArray(currentPhoto.tags)) {
      displayTagNames = currentPhoto.tags.map(tag => tag.name).filter(Boolean);
    }

    const hasActions = (!!groupId && showEdit) || showDelete;

    return (
      <LightboxFloatingInfo 
        displayName={currentPhotoDisplayName}
        categoryName={displayCategoryName}
        tags={displayTagNames}
        isGroup={mode === 'group'}
        appLang={appLang}
        hasActions={hasActions}
      />
    );
  };

  return (
    <>
      <ReelkitAdapter
        open={isOpen}
        items={photos.map(p => ({
          src: p.thumbnail_md_url || p.image_url || '',
          thumbnail: p.thumbnail_sm_url || p.image_url || '',
          alt: (p.name as any)?.zh || String(p.name || ''),
        }))}
        currentIndex={currentIndex}
        onClose={closeWithCleanup}
        onIndexChange={(idx: number) => {
          const photo = photos[idx];
          if (photo) setPhotoIdDebounced(photo.id);
        }}
        onEdit={showEdit ? handleEdit : undefined}
        onDelete={showDelete ? handleDelete : undefined}
        onSetCover={handleSetCover}
        showSetCover={!!groupId && showEdit}
        renderSidebar={renderSidebar}
        renderFloatingButton={renderFloatingButton}
        totalCount={totalCount}
        showInfo={showInfo}
        onToggleInfo={setShowInfo}
      />
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={deleteDialog.toggle}
        title="确认删除照片"
        description={`您确定要彻底删除该照片 "${currentPhotoDisplayName}" 吗？此操作无法撤销。`}
        confirmText="立即删除"
        variant="destructive"
        onConfirm={async () => {
          if (currentPhoto) {
            try {
              await adminActions.deletePhoto([currentPhoto.id]);
              close();
            } catch (err) {
              // Handle error
            }
          }
        }}
      />
    </>
  );
};

export default PhotoLightboxPage;

const LightboxLoadingFallback = () => {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    if (ref.current && !ref.current.open) {
      ref.current.showModal();
    }
    return () => {
      if (ref.current && ref.current.open) {
        ref.current.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="m-0 p-0 border-0 bg-transparent flex h-full max-h-none w-full max-w-none items-center justify-center outline-none backdrop:bg-black/95 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
      </div>
    </dialog>
  );
};
