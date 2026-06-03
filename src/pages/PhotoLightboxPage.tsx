import React from "react";
import { LightboxCore } from "@/components/PhotoLightbox/LightboxCore";
import { useLightbox } from "@/hooks/useLightbox";
import { PhotoInfoPanel } from "@/components/photo/PhotoInfoPanel";
import { LightboxFallback } from "@/components/PhotoLightbox/LightboxFallback";

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
  
  if (!isOpen) return null;
  
  // If we have a photoId but no photos (e.g. invalid ID or deleted)
  if (photos.length === 0) {
    return <LightboxFallback onClose={close} message="照片不存在或已删除" />;
  }
  
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
        className="hidden md:flex shrink-0 animate-in slide-in-from-right duration-500 ease-out z-[210] shadow-2xl"
      />
    </div>
  );
};

export default PhotoLightboxPage;
