import React, { useState, useEffect } from "react";
import Lightbox, { IconButton } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download, Pencil, Trash2, Crown, Sparkles } from "lucide-react";
import { Photo, ProductGroup } from "@/types";
import { useUIStore } from "@/store/useUIStore";
import { LIGHTBOX_PLUGINS, LIGHTBOX_OPTIONS } from "./lightboxConfig";
import { toLightboxSlides } from "./lightboxSlides";
import { downloadPhotoAsJpeg } from "@/lib/download";
import { PhotoInfoPanel } from "../photo/PhotoInfoPanel";
import { useSettings } from "@/hooks";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

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
  showSetCover?: boolean;
  onEdit?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onSetCover?: (photo: Photo) => void;
  totalCount?: number;
  renderSidebar?: () => React.ReactNode;
  renderFloatingButton?: () => React.ReactNode;
}

export const LightboxCore = ({ 
  open, onClose, photos, currentIndex = 0, onIndexChange, totalCount,
  mode = 'single', showEdit, showDelete, showAi, showSetCover,
  onEdit, onDelete, onAiAnalyze, onSetCover,
  renderSidebar, renderFloatingButton
}: LightboxCoreProps) => {
  const [index, setIndex] = useState(currentIndex);
  const lang = useUIStore(s => s.appLang);
  const slides = toLightboxSlides(photos, lang);
  
  // Keep index synchronized with currentIndex prop
  React.useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);
  
  useEffect(() => {
    if (open) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [open]);
  
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
      plugins={LIGHTBOX_PLUGINS.filter(p => p.name !== 'captions')}
       toolbar={{
        buttons: [
          showSetCover && (
            <IconButton
              key="cover"
              label={"设为封面" as any}
              icon={Crown}
              onClick={() => { const p = photos[index]; if (p) onSetCover?.(p); }}
              className="text-amber-400 hover:text-amber-300"
            />
          ),
          showEdit && (
            <IconButton
              key="edit"
              label={"编辑" as any}
              icon={Pencil}
              onClick={() => { const p = photos[index]; if (p) onEdit?.(p); }}
            />
          ),
          showDelete && (
            <IconButton
              key="delete"
              label={"删除" as any}
              icon={Trash2}
              onClick={() => { const p = photos[index]; if (p) onDelete?.(p); }}
              className="text-red-400 hover:text-red-300"
            />
          ),
          <IconButton
            key="download"
            label={"下载" as any}
            icon={Download}
            onClick={() => { const p = photos[index]; if (p) downloadPhotoAsJpeg(p.image_url); }}
          />,
        ].filter(Boolean) as any[]
      }}
      render={{
        buttonZoom: () => null,
        // Custom interactive controls overlaid on lightbox
        controls: () => (
          <>
            <div className="absolute top-4 left-4 z-[var(--z-lightbox-content,1002)] text-white font-medium bg-black/50 px-3 py-1 rounded-full text-[10px] sm:text-sm backdrop-blur-sm shadow-lg pointer-events-none">
                 {index + 1} / {totalCount || slides.length}
            </div>

            {renderSidebar?.()}
            {renderFloatingButton?.()}
          </>
        ),
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
