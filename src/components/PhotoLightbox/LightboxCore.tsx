import React, { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download, Pencil, Trash2, Info, Crown, Sparkles } from "lucide-react";
import { Photo, ProductGroup } from "@/types";
import { useUIStore } from "@/store/useUIStore";
import { LIGHTBOX_PLUGINS, LIGHTBOX_OPTIONS } from "./lightboxConfig";
import { toLightboxSlides } from "./lightboxSlides";
import { downloadPhotoAsJpeg } from "@/lib/download";
import { PhotoInfoPanel } from "../photo/PhotoInfoPanel";
import { useSettings } from "@/hooks";

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
  const [showDetails, setShowDetails] = useState(true);
  const lang = useUIStore(s => s.appLang);
  const slides = toLightboxSlides(photos, lang);
  
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
      plugins={LIGHTBOX_PLUGINS.filter(p => p.name !== 'captions')}
      render={{
        // Custom interactive controls overlaid on lightbox
        controls: () => (
          <>
            <div className="absolute top-4 left-4 z-50 text-white font-medium bg-black/50 px-3 py-1 rounded-full text-[10px] sm:text-sm backdrop-blur-sm shadow-lg pointer-events-none">
                 {index + 1} / {totalCount || slides.length}
            </div>
            
            {/* Top Right Tool Area - Shifted left to avoid Close button */}
            <div className="absolute top-2 right-12 z-50 flex items-center gap-1 sm:gap-2 p-2 pointer-events-auto">
              {showSetCover && (
                <button
                  onClick={() => {
                    const photo = photos[index];
                    if (photo) onSetCover?.(photo);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-amber-400 transition-all border border-white/10"
                  aria-label="设为封面"
                  title="设为封面"
                >
                  <Crown size={20} className="fill-current" />
                </button>
              )}
              {showEdit && (
                <button
                  onClick={() => {
                    const photo = photos[index];
                    if (photo) onEdit?.(photo);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-all border border-white/10"
                  aria-label="编辑"
                  title="编辑"
                >
                  <Pencil size={20} />
                </button>
              )}
              <button
                onClick={() => {
                  const photo = photos[index];
                  if (photo) downloadPhotoAsJpeg(photo.image_url);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-all border border-white/10"
                aria-label="下载"
                title="下载"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border border-white/10 ${showDetails ? 'bg-brand-gold text-white shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-black/30 text-white hover:bg-black/50'}`}
                aria-label="详情"
                title="详情"
              >
                <Info size={20} />
              </button>
            </div>

            {showDetails && renderSidebar?.()}
            {renderFloatingButton?.()}
          </>
        ),
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
