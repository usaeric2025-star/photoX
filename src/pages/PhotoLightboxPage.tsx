import React from "react";
import { LightboxCore } from "@/components/PhotoLightbox/LightboxCore";
import { useLightbox } from "@/hooks/useLightbox";
import { PhotoInfoPanel } from "@/components/photo/PhotoInfoPanel";
import { LightboxFallback } from "@/components/PhotoLightbox/LightboxFallback";
import { useUIStore } from "@/store/useUIStore";
import { useAdminActions } from "@/features/admin/useAdminActions";

/**
 * [PAGE] PhotoLightboxPage
 * Global entry point for the photo lightbox. 
 * Mounted at the root to ensure isolation from virtual scrolls.
 */
export const PhotoLightboxPage = () => {
  const { 
    isOpen, close, photos, currentIndex, setPhotoId,
    mode, data, showEdit, showDelete, showAi, isLoading
  } = useLightbox();
  
  const updateUIStore = useUIStore((s) => s.update);
  const adminActions = useAdminActions();
  const currentPhoto = photos[currentIndex];
  
  if (!isOpen) return null;

  // Show loading skeleton or similar if data is still being fetched
  if (isLoading && photos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[250] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white/60 text-sm font-medium">正在加载照片 / Loading...</p>
      </div>
    );
  }
  
  // If we have a photoId but no photos (e.g. invalid ID or deleted)
  if (photos.length === 0 && !isLoading) {
    return <LightboxFallback onClose={close} message="照片不存在或已删除" />;
  }

  const handleEdit = () => {
    if (currentPhoto) {
      updateUIStore({ editPhotoId: currentPhoto.id });
      close(); // Close the lightbox cleanly so the custom edit drawer sheet has focus
    }
  };

  const handleDelete = () => {
    if (currentPhoto) {
      updateUIStore({
        alertDialog: {
          title: "确认删除照片",
          message: `您确定要彻底删除该照片 "${currentPhoto.name}" 吗？此操作无法撤销。`,
          confirmLabel: "立即删除",
          type: "danger",
          onConfirm: async () => {
            try {
              await adminActions.deletePhoto([currentPhoto.id]);
              updateUIStore({ alertDialog: null });
              close();
            } catch (err) {
              updateUIStore({ alertDialog: null });
            }
          },
          onCancel: () => {
            updateUIStore({ alertDialog: null });
          }
        }
      });
    }
  };

  const handleAiAnalyze = () => {
    if (currentPhoto) {
      updateUIStore({ editPhotoId: currentPhoto.id });
      close();
    }
  };
  
  return (
    <LightboxCore
      open={isOpen}
      onClose={close}
      photos={photos}
      currentIndex={currentIndex}
      onIndexChange={(idx) => {
        const photo = photos[idx];
        if (photo) setPhotoId(photo.id);
      }}
      mode={mode as 'single' | 'group'}
      showEdit={showEdit}
      showDelete={showDelete}
      showAi={showAi}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAiAnalyze={handleAiAnalyze}
    />
  );
};

export default PhotoLightboxPage;
