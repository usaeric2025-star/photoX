import React, { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download, Pencil, Trash2, Info } from "lucide-react";
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
  showInfo?: boolean;
  setShowInfo?: (show: boolean) => void;
}

export const LightboxCore = ({ 
  open, onClose, photos, currentIndex = 0, onIndexChange,
  mode = 'single', showEdit, showDelete, showAi,
  onEdit, onDelete, onAiAnalyze,
  showInfo, setShowInfo
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
        toolbar: ({ toolbar }) => (
          <>
            {toolbar}
            {setShowInfo && (
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1050] flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-xl text-white border border-white/20 shadow-2xl hover:bg-black/80 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Info size={16} className={showInfo ? "opacity-50" : ""} />
                <span className="text-sm font-bold tracking-wide">{showInfo ? "关闭信息" : "照片信息"}</span>
              </button>
            )}
          </>
        ),
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
        )
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
