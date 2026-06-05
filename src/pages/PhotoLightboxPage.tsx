import React from "react";
import { Info, Tag as TagIcon, Grid } from "lucide-react";
import { createPortal } from "react-dom";
import { LightboxCore } from "@/components/PhotoLightbox/LightboxCore";
import { useLightbox } from "@/hooks/useLightbox";
import { PhotoInfoPanel } from "@/components/photo/PhotoInfoPanel";
import { LightboxFallback } from "@/components/PhotoLightbox/LightboxFallback";
import { useUIStore } from "@/store/useUIStore";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { useTags } from "@/hooks/core/queries/useTags";
import { useCategories } from "@/hooks/core/queries/useCategories";
import { useGroupCoverMutation } from "@/hooks/core/mutations/useGroupMutations";
import { getTranslatedCategoryName } from "@/lib/ui-helpers";
import { translations } from "@/lib/translations";
import { useDisclosure } from "@mantine/hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/lib/ui/toast";

/**
 * [PAGE] PhotoLightboxPage
 * Global entry point for the photo lightbox. 
 * Mounted at the root to ensure isolation from virtual scrolls.
 */
export const PhotoLightboxPage = () => {
  const { 
    isOpen, close, photos, currentIndex, setPhotoId,
    mode, data, showEdit, showDelete, showAi, isLoading, groupId
  } = useLightbox();
  
  const updateUIStore = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);
  const adminActions = useAdminActions();
  const { mutateAsync: setCoverMut } = useGroupCoverMutation();
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null;

  const handleSetCover = async (photo: any) => {
    if (!groupId) return;
    try {
      await setCoverMut({ groupId, photoId: photo.id });
      toast.success(photo.name?.zh ? `已将 "${photo.name.zh}" 设为封面` : '封面设置成功');
    } catch (e) {
      toast.error('设置封面失败');
    }
  };
  const [showInfo, setShowInfo] = React.useState(false);
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  
  const { data: tags = [] } = useTags();
  const { data: categories = [] } = useCategories();
  
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

  const handleDelete = () => deleteDialog.open();

  const handleAiAnalyze = () => {
    if (currentPhoto) {
      updateUIStore({ editPhotoId: currentPhoto.id });
      close();
    }
  };
  
  const currentPhotoDisplayName = currentPhoto ? (typeof currentPhoto.name === 'object' ? (currentPhoto.name[appLang as keyof typeof currentPhoto.name] || currentPhoto.name.zh) : currentPhoto.name) : '';

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
        showSetCover={!!groupId && showEdit}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAiAnalyze={handleAiAnalyze}
        onSetCover={handleSetCover}
        renderSidebar={() => 
          showInfo && currentPhoto ? (
            <>
              <div 
                className="absolute inset-0 z-[10] bg-black/20 backdrop-blur-sm/50 transition-opacity"
                onClick={() => setShowInfo(false)}
              />
              <div className="absolute right-0 top-0 h-full w-full md:w-[380px] pointer-events-none flex items-center z-[11] p-0">
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
          ) : null
        }
        renderFloatingButton={() => {
          if (!currentPhoto) return null;
          
          let displayCategoryName = '';
          if (currentPhoto.category_id) {
            displayCategoryName = getTranslatedCategoryName(currentPhoto.category_id, categories, appLang, translations[appLang]);
          }
          
          let displayTagNames: string[] = [];
          if (Array.isArray(currentPhoto.tag_ids)) {
            displayTagNames = currentPhoto.tag_ids.map(id => {
              const t = tags.find(tag => String(tag.id) === String(id));
              return t ? t.name : '';
            }).filter(Boolean);
          }

          return (
            <>
              {/* Photo Simplified Info Overlay */}
              {!showInfo && (
                <div className="absolute bottom-[10px] left-4 md:bottom-[12px] md:left-6 z-[12] pointer-events-none flex flex-col items-start justify-end max-w-[70%] md:max-w-[60%] select-none">
                  {currentPhotoDisplayName && (
                    <h2 className="text-white text-lg md:text-xl font-bold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] mb-1.5 line-clamp-2">
                      {currentPhotoDisplayName}
                    </h2>
                  )}
                  
                  {(displayCategoryName || displayTagNames.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 drop-shadow-md">
                       {displayCategoryName && (
                         <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-white/90 bg-white/20 backdrop-blur-md px-2 py-1 rounded border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                           <Grid size={10} /> {displayCategoryName}
                         </span>
                       )}
                       {displayTagNames.slice(0, 3).map((tag, i) => (
                         <span key={i} className="flex items-center gap-0.5 text-[10px] md:text-xs font-semibold text-white/90 bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                           #{tag}
                         </span>
                       ))}
                       {displayTagNames.length > 3 && (
                         <span className="text-[10px] md:text-xs font-semibold text-white/70 bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                           +{displayTagNames.length - 3}
                         </span>
                       )}
                    </div>
                  )}
                </div>
              )}

              {/* Floating Action Button for Info Panel Toggle */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                // onPointerDown blocks yarl from catching the click as a backdrop swipe
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-[10px] right-4 md:bottom-[12px] md:right-6 z-[12] flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-full bg-black/70 backdrop-blur-xl text-white border border-white/20 shadow-2xl hover:bg-black/90 active:scale-[0.96] transition-all group pointer-events-auto"
                title={showInfo ? (appLang === 'zh' ? '关闭信息' : appLang === 'ms' ? 'Tutup Maklumat' : 'Close Info') : (appLang === 'zh' ? '展开详细信息' : appLang === 'ms' ? 'Tunjuk Butiran' : 'Show Details')}
              >
                <div className="md:hidden flex items-center justify-center">
                  {showInfo ? <span className="font-bold text-lg leading-none">✕</span> : <Info size={18} />}
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Info size={16} className={showInfo ? "opacity-50" : "group-hover:scale-110 transition-transform"} />
                  <span className="text-xs font-bold tracking-wide">
                    {showInfo 
                      ? (appLang === 'zh' ? '关闭详情' : appLang === 'ms' ? 'Tutup Butiran' : 'Close Details')
                      : (appLang === 'zh' ? '属性信息' : appLang === 'ms' ? 'Maklumat Atribut' : 'Attributes')}
                  </span>
                </div>
              </button>
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
    </div>
  );
};

export default PhotoLightboxPage;
