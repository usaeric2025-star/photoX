import React from "react";
import { Info } from "lucide-react";
import { createPortal } from "react-dom";
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
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null;
  const [showInfo, setShowInfo] = React.useState(false);
  
  if (!isOpen) return null;

  // [OPTIMIZATION] Directly show the frame if we have photos from list cache
  // This allows the lightbox to show the cached thumbnail while the detail loads
  if (photos.length === 0 && isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[250] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
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
      close(); 
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
    <div className="contents">
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
        showInfo={showInfo}
        setShowInfo={setShowInfo}
      />
      {currentPhoto && typeof document !== "undefined" && createPortal(
        <>
          {/* The Sidebar Panel */}
          {showInfo && (
            <>
              <div 
                className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-sm/50 transition-opacity"
                onClick={() => setShowInfo(false)}
              />
              <div className="fixed right-0 top-0 h-full w-full md:w-[380px] pointer-events-none flex items-center z-[10001] p-0">
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
                  className="pointer-events-auto w-full h-full shadow-2xl shadow-black/20 border-l border-white/20 bg-background/95 backdrop-blur-2xl animate-in slide-in-from-right duration-300 ease-out overflow-y-auto"
                />
              </div>
            </>
          )}

          {/* Floating Action Button for Info Panel Toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="fixed bottom-6 right-6 md:right-1/2 md:translate-x-1/2 z-[10502] flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 rounded-full bg-black/70 backdrop-blur-xl text-white border border-white/20 shadow-2xl hover:bg-black/90 active:scale-[0.96] transition-all group"
          >
            <div className="md:hidden">
              {showInfo ? <span className="font-bold text-lg">✕</span> : <Info size={24} />}
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Info size={16} className={showInfo ? "opacity-50" : "group-hover:scale-110 transition-transform"} />
              <span className="text-sm font-bold tracking-wide">{showInfo ? "关闭信息" : "照片信息"}</span>
            </div>
          </button>
        </>,
        document.body
      )}
    </div>
  );
};

export default PhotoLightboxPage;
