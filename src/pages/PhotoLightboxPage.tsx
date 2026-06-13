import React from "react";
import { Info, Tag as TagIcon, Grid } from "lucide-react";
import { LightboxCore } from "@/components/PhotoLightbox/LightboxCore";
import { useLightbox } from "@/hooks";
import { PhotoInfoPanel } from "@/components/photo/PhotoInfoPanel";
import { LightboxFallback } from "@/components/PhotoLightbox/LightboxFallback";
import { useUIStore } from "@/store/useUIStore";
import { useAdminMaintenance } from "@/hooks/admin/useAdminMaintenance";
import { useTags, useCategories } from "@/hooks";
import { useGroupCoverMutation } from "@/hooks";
import { getTranslatedCategoryName } from "@/services/category/utils";
import { translations } from "@/locales";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from '@/lib/ui/toast';
import { getSafeText } from "@/services/ai/safeText";

import { LightboxFloatingInfo } from "@/components/PhotoLightbox/LightboxFloatingInfo";
import { LightboxFloatingActions } from "@/components/PhotoLightbox/LightboxFloatingActions";

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
    return <LightboxFallback onClose={close} message="照片不存在或已删除" />;
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

  return (
    <>
      <LightboxCore
        open={isOpen}
        onClose={closeWithCleanup}
        photos={photos}
        totalCount={totalCount}
        currentIndex={currentIndex}
        onIndexChange={(idx) => {
          const photo = photos[idx];
          if (photo) setPhotoIdDebounced(photo.id);
        }}
        mode={mode as 'single' | 'group'}
        showEdit={showEdit}
        showDelete={showDelete}
        showAi={showAi}
        showSetCover={!!groupId && showEdit}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAiAnalyze={handleAiAnalyze}
        onSetCover={handleSetCover}
        renderSidebar={() => 
          showInfo && currentPhoto ? (
            <>
              <div 
                className="absolute inset-0 z-[var(--z-dialog)] bg-black/20 backdrop-blur-sm/50 transition-opacity"
                onClick={() => setShowInfo(false)}
              />
              <div className="absolute right-0 top-0 h-full w-full md:w-[380px] pointer-events-none flex items-center z-[var(--z-dialog)] p-0">
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
                  className="pointer-events-auto w-full h-full shadow-2xl shadow-black/20 border-l border-slate-200 bg-white animate-in slide-in-from-right duration-300 ease-out"
                  headerClassName="md:pl-4 pl-20"
                />
              </div>
            </>
          ) : null
        }
        renderFloatingButton={() => {
          if (!currentPhoto) return null;
          
          let displayCategoryName = '';
          if (currentPhoto.category_id) {
            displayCategoryName = getTranslatedCategoryName(currentPhoto.category_id, categories, appLang, translations[appLang]);
          }
          
          let displayTagNames: string[] = [];
          if (Array.isArray(currentPhoto.tags)) {
            displayTagNames = currentPhoto.tags.map(tag => tag.name).filter(Boolean);
          }

          return (
            <>
              {!showInfo && (
                <LightboxFloatingInfo 
                  displayName={currentPhotoDisplayName}
                  categoryName={displayCategoryName}
                  tags={displayTagNames}
                  isGroup={mode === 'group'}
                  appLang={appLang}
                />
              )}

              <LightboxFloatingActions 
                showInfo={showInfo}
                setShowInfo={setShowInfo}
                appLang={appLang}
              />
            </>
          );
        }}
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
