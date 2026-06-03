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
    mode, data, showEdit, showDelete, showAi 
  } = useLightbox();
  
  const updateUIStore = useUIStore((s) => s.update);
  const adminActions = useAdminActions();
  const currentPhoto = photos[currentIndex];
  
  if (!isOpen) return null;
  
  // If we have a photoId but no photos (e.g. invalid ID or deleted)
  if (photos.length === 0) {
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
    <div className="fixed inset-0 z-[200] flex animate-in fade-in duration-300 overflow-hidden">
      <div className="flex-1 relative bg-black">
        <LightboxCore
          open={isOpen}
          onClose={close}
          photos={photos}
          currentIndex={currentIndex}
          onIndexChange={(idx) => {
            const photo = photos[idx];
            if (photo) setPhotoId(photo.id);
          }}
        />
      </div>

      {/* Info Panel - Displaying metadata for current photo or group context */}
      <PhotoInfoPanel 
        mode={mode as 'single' | 'group'}
        data={data}
        showEdit={showEdit}
        showDelete={showDelete}
        showAi={showAi}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAiAnalyze={handleAiAnalyze}
        className="hidden md:flex shrink-0 animate-in slide-in-from-right duration-500 ease-out z-[210] shadow-2xl"
      />
    </div>
  );
};

export default PhotoLightboxPage;
