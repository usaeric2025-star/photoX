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
  renderSidebar?: () => React.ReactNode;
  renderFloatingButton?: () => React.ReactNode;
}

export const LightboxCore = ({ 
  open, onClose, photos, currentIndex = 0, onIndexChange,
  mode = 'single', showEdit, showDelete, showAi,
  onEdit, onDelete, onAiAnalyze,
  renderSidebar, renderFloatingButton
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
        // Custom interactive controls overlaid on lightbox
        controls: () => (
          <>
            {renderSidebar?.()}
            {renderFloatingButton?.()}
          </>
        ),
        // Render default toolbar plus custom buttons
        toolbar: ({ toolbar }: any) => (
          <>
            {toolbar}
          </>
        ),
        // Overwrite the download button with multiple actions
        buttonDownload: () => (
          <div className="flex items-center gap-0.5 mr-2">
            {showEdit && (
              <button
                onClick={() => {
                  const photo = photos[index];
                  if (photo) onEdit?.(photo);
                }}
                className="yarl__button !p-2 rounded-full hover:bg-slate-100/10 transition-all"
                aria-label="编辑"
                title="编辑"
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              onClick={() => {
                const photo = photos[index];
                if (photo) downloadPhotoAsJpeg(photo.image_url);
              }}
              className="yarl__button !p-2 rounded-full hover:bg-slate-100/10 transition-all"
              aria-label="下载"
              title="下载"
            >
              <Download size={18} />
            </button>
          </div>
        ),
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
