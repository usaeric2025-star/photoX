import React from "react";
import { Info, Tag as TagIcon, Grid } from "lucide-react";
import { Lightbox } from "@/components/lightbox/Lightbox";
import { useLightbox } from "@/hooks";
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
    }, 80);
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

  const handleSetCover = async () => {
    if (!groupId || !currentPhoto) return;
    try {
      await setCoverMut({ groupId, photoId: currentPhoto.id });
      const displayName = getSafeText(currentPhoto.name, appLang);
      showToast.success(displayName ? `已将 "${displayName}" 设为封面` : '封面设置成功');
    } catch (e) {
      showToast.error('设置封面失败');
    }
  };
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  
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
  
  const currentPhotoDisplayName = currentPhoto 
    ? (typeof currentPhoto.name === 'object' && currentPhoto.name !== null 
        ? ((currentPhoto.name as any)[appLang] || (currentPhoto.name as any).zh || '') 
        : String(currentPhoto.name || '')) 
    : '';

  return (
    <>
      <Lightbox
        mode={showEdit || showDelete ? 'admin' : 'public'}
        open={isOpen}
        items={photos.map((p: any) => ({
          id: p.id,
          src: p.image_url || '',
          thumbnail: p.thumbnail_sm_url || p.thumbnail_md_url || p.image_url || '',
          title: (p.name as any)?.zh || String(p.name || ''),
        }))}
        initialIndex={currentIndex}
        onClose={closeWithCleanup}
        onIndexChange={(idx: number) => {
          const photo = photos[idx];
          if (photo) setPhotoIdDebounced(photo.id);
        }}
        onEdit={showEdit ? handleEdit : undefined}
        onDelete={showDelete ? handleDelete : undefined}
        onSetCover={!!groupId && showEdit ? handleSetCover : undefined}
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
    const dialogNode = ref.current;
    if (dialogNode && !dialogNode.open) {
      try {
        dialogNode.showModal();
      } catch (e) {
        console.warn('[LightboxLoadingFallback] Failed to execute showModal, falling back to open attribute:', e);
        dialogNode.setAttribute('open', '');
      }
    }
    return () => {
      if (dialogNode && dialogNode.open) {
        try {
          dialogNode.close();
        } catch (e) {
          dialogNode.removeAttribute('open');
        }
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
