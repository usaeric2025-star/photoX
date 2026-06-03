import React, { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download } from "lucide-react";
import { Photo } from "@/types";
import { LIGHTBOX_PLUGINS, LIGHTBOX_OPTIONS } from "./lightboxConfig";
import { toLightboxSlides } from "./lightboxSlides";
import { downloadPhotoAsJpeg } from "@/lib/download";

interface LightboxCoreProps {
  open: boolean;
  onClose: () => void;
  photos: Photo[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export const LightboxCore = ({ open, onClose, photos, currentIndex = 0, onIndexChange }: LightboxCoreProps) => {
  const [index, setIndex] = useState(currentIndex);
  const slides = toLightboxSlides(photos);
  
  if (slides.length === 0) return null;

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      on={{ 
        view: ({ index }) => {
          setIndex(index);
          onIndexChange?.(index);
        } 
      }}
      slides={slides}
      plugins={LIGHTBOX_PLUGINS}
      render={{
        buttonDownload: () => (
          <button 
            type="button" 
            className="yarl__button" 
            style={{ width: "var(--yarl__button_size, 48px)", height: "var(--yarl__button_size, 48px)", padding: "var(--yarl__button_padding, 12px)" }}
            onClick={() => {
              const photo = photos[index];
              if (photo) downloadPhotoAsJpeg(photo.image_url);
            }}
          >
            <Download size={24} />
          </button>
        )
      }}
      {...LIGHTBOX_OPTIONS}
    />
  );
};
