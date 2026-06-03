import React, { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Photo, ProductGroup } from "@/types";
import { LIGHTBOX_PLUGINS, LIGHTBOX_OPTIONS } from "./lightboxConfig";
import { toLightboxSlides } from "./lightboxSlides";
import { downloadPhotoAsJpeg } from "@/lib/download";
import { PhotoInfoPanel } from "../photo/PhotoInfoPanel";

interface LightboxCoreProps {
  open: boolean;
  onClose: () => void;
  photos: Photo[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  // Business logic props
  mode?: 'single' | 'group';
  showEdit?: boolean;
  showDelete?: boolean;
  showAi?: boolean;
  onEdit?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
}

export const LightboxCore = ({ 
  open, onClose, photos, currentIndex = 0, onIndexChange,
  mode = 'single', showEdit, showDelete, showAi,
  onEdit, onDelete, onAiAnalyze
}: LightboxCoreProps) => {
  const [index, setIndex] = useState(currentIndex);
  const slides = toLightboxSlides(photos);
  
  // Keep index synchronized with currentIndex prop
  React.useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);
  
  if (slides.length === 0) return null;

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      on={{ 
        view: ({ index: newIndex }) => {
          setIndex(newIndex);
          onIndexChange?.(newIndex);
        } 
      }}
      slides={slides}
      plugins={LIGHTBOX_PLUGINS}
      render={{
        buttonDownload: () => (
          <div className="flex items-center gap-1">
            {showEdit && (
              <button 
                type="button" 
                className="yarl__button" 
                onClick={() => {
                  const photo = photos[index];
                  if (photo) onEdit?.(photo);
                }}
                title="编辑照片"
              >
                <Pencil size={20} />
              </button>
            )}
            <button 
              type="button" 
              className="yarl__button" 
              onClick={() => {
                const photo = photos[index];
                if (photo) downloadPhotoAsJpeg(photo.image_url);
              }}
              title="下载原图"
            >
              <Download size={22} />
            </button>
          </div>
        ),
        slideFooter: ({ slide }) => {
          const photo = (slide as any).photo as Photo;
          if (!photo) return null;
          
          return (
            <div className="absolute right-0 top-0 h-full w-[350px] p-4 pointer-events-none hidden md:flex items-center">
              <PhotoInfoPanel 
                mode={mode}
                data={photo}
                showEdit={showEdit}
                showDelete={showDelete}
                showAi={showAi}
                onEdit={() => onEdit?.(photo)}
                onDelete={() => onDelete?.(photo)}
                onAiAnalyze={() => onAiAnalyze?.(photo)}
                className="pointer-events-auto w-full h-full shadow-2xl border-none bg-white/95 backdrop-blur-md animate-in slide-in-from-right duration-500 ease-out z-[210] overflow-y-auto"
              />
            </div>
          );
        }
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
