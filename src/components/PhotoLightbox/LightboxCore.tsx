import React, { useState, useEffect } from "react";
import Lightbox, { IconButton } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download, Pencil, Trash2, Crown, Sparkles, X } from "lucide-react";
import { Photo, ProductGroup } from "@/types";
import { useUIStore } from "@/store/useUIStore";
import { LIGHTBOX_PLUGINS, LIGHTBOX_OPTIONS } from "./lightboxConfig";
import { downloadPhotoAsJpeg } from "@/services/photo/downloadService";
import { PhotoInfoPanel } from "../photo/PhotoInfoPanel";
import { useSettings } from "@/hooks";
import { lockScroll, unlockScroll } from "@/lib/ui/scrollLock";
import { OptimizedImage } from "../shared/OptimizedImage";
import { getSafeText } from "@/services/ai/safeText";
import { getThumbnailUrl } from "@/services/photo/utils";

export interface LightboxActions {
  onEdit?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onSetCover?: (photo: Photo) => void;
}

export interface LightboxOptions {
  mode?: 'single' | 'group';
  showEdit?: boolean;
  showDelete?: boolean;
  showAi?: boolean;
  showSetCover?: boolean;
  renderSidebar?: () => React.ReactNode;
  renderFloatingButton?: () => React.ReactNode;
}

interface LightboxCoreProps extends LightboxActions, LightboxOptions {
  open: boolean;
  onClose: () => void;
  photos: Photo[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  totalCount?: number;
}

export const LightboxCore = ({ 
  open, onClose, photos, currentIndex = 0, onIndexChange, totalCount,
  mode = 'single', showEdit, showDelete, showAi, showSetCover,
  onEdit, onDelete, onAiAnalyze, onSetCover,
  renderSidebar, renderFloatingButton
}: LightboxCoreProps) => {
  const [index, setIndex] = useState(currentIndex);
  const lang = useUIStore(s => s.appLang);
  // Responsive preload
  const preloadCount = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2;

  const slides = photos.map(photo => {
    const thumbUrl = getThumbnailUrl(photo.image_url, 320, photo.updated_at);
    return {
      src: photo.image_url,
      alt: getSafeText(photo.name, lang) || "",
      thumbnail: thumbUrl,
      srcSet: [
        { src: thumbUrl, width: 320, height: 320 },
        { src: photo.image_url, width: 1920, height: 1920 },
      ],
      sizes: "100vw",
      key: photo.image_url,
      photo
    };
  });

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
  
  if (slides.length === 0 || !open) return null;

  if (typeof document === 'undefined') return null;

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
      carousel={{ preload: preloadCount }}
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
        slide: ({ slide }) => {
          const s = slide as any;
          const photo = s.photo as Photo;
          return (
            <div 
              className="w-full h-full flex items-center justify-center p-4 sm:p-8"
            >
              <OptimizedImage 
                src={s.src} 
                alt={s.alt}
                srcSet={s.srcSet?.map((i: any) => `${i.src} ${i.width}w`).join(', ')}
                sizes={s.sizes}
                eager
                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" 
              />
            </div>
          );
        },
        // Custom interactive controls overlaid on lightbox
        controls: () => (
          <>
            <div className="absolute top-4 left-4 text-white font-medium bg-black/50 px-3 py-1 rounded-full text-[10px] sm:text-sm backdrop-blur-sm shadow-lg pointer-events-none">
                 {index + 1} / {totalCount || slides.length}
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {renderSidebar?.()}
            {renderFloatingButton?.()}
          </>
        ),
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
