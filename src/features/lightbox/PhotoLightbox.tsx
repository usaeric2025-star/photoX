import { useMemo, useState, useEffect } from 'react';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/image-gallery.css';
import { Photo } from '@/types';
import { useLightbox } from '@/lib/lightbox';
import { useFilters } from '@/features/filters';
import { Modal } from '@/components/ui/Modal';

interface PhotoLightboxProps {
  photos?: Photo[];
  initialIndex?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onEdit?: (photo: any) => void;
}

type GalleryItem = any;

export function PhotoLightbox(props: Partial<PhotoLightboxProps>) {
  const { 
    isOpen: hookIsOpen, 
    slides: hookSlides, 
    currentIndex: hookIndex, 
    close: hookClose,
    setLightboxIndex
  } = useLightbox();
  
  const photos = (props.photos && props.photos.length > 0) ? props.photos : hookSlides;
  const initialIndex = props.initialIndex ?? hookIndex;
  const isOpen = props.isOpen ?? hookIsOpen;
  const onClose = props.onClose || hookClose;
  const { setPhotoId, setModal } = useFilters();
  
  const onEdit = props.onEdit || ((photo: any) => {
    setPhotoId(photo.id);
    setModal('edit');
  });

  const [showInfo, setShowInfo] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');

  // Key to force re-mount of ImageGallery when opening to a specific index
  const galleryKey = useMemo(() => `gallery-${isOpen}-${initialIndex}`, [isOpen, initialIndex]);

  const items = useMemo(() => 
    photos.map((p: any): GalleryItem => {
      // Handle LightboxSlide vs raw Photo
      const photo = p.original || p;
      const src = p.src || photo.imageUrl || photo.uri;
      const title = p.title || photo.name || 'Photo';

      return {
        original: src,
        thumbnail: src,
        originalAlt: title,
        description: '', 
        _data: photo,
      };
    }),
    [photos]
  );

  const [localIndex, setLocalIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setLocalIndex(initialIndex);
      setShowInfo(false); // Default to closed when opening
    }
  }, [isOpen, initialIndex]);

  const currentPhoto = photos[localIndex] || photos[0];

  const handleSlide = (index: number) => {
    setLocalIndex(index);
    setLightboxIndex(index);
  };

  return (
    <Modal
      id="photo-lightbox"
      open={isOpen}
      onClose={onClose}
      size="screen"
      hidePadding
      showCloseButton={false}
      className="bg-black border-none overflow-hidden"
    >
      {isOpen && photos.length > 0 ? (
        <div className="absolute inset-0 bg-black flex flex-col" key={galleryKey}>
          <style>{`
            .image-gallery {
              width: 100%;
              height: 100%;
            }
            .image-gallery-content {
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .image-gallery-slide-wrapper {
              flex: 1;
              min-height: 0;
              position: relative;
            }
            .image-gallery-swipe, .image-gallery-slides, .image-gallery-slide {
              height: 100% !important;
            }
            .image-gallery-slide .image-gallery-image {
              max-height: 100% !important;
              width: auto !important;
              height: 100% !important;
              object-fit: contain !important;
              margin: 0 auto !important;
              display: block !important;
            }
            .image-gallery-thumbnails-wrapper {
              background: #000 !important;
              padding: 12px 0 !important;
              border-top: 1px solid rgba(255,255,255,0.1);
              z-index: 30 !important;
            }
            .image-gallery-thumbnail {
              width: 70px !important;
              height: 48px !important;
              border: 2px solid transparent !important;
              border-radius: 8px !important;
              overflow: hidden !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              margin: 0 4px !important;
              background: #111 !important;
              opacity: 0.5;
            }
            .image-gallery-thumbnail.active {
              border-color: #3b82f6 !important;
              transform: scale(1.08);
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
              opacity: 1;
            }
            .image-gallery-icon {
                filter: drop-shadow(0 4px 12px rgba(0,0,0,0.9)) !important;
                transition: transform 0.2s ease, color 0.2s ease !important;
            }
            .image-gallery-icon:hover {
                color: #3b82f6 !important;
                transform: scale(1.1);
            }
            .image-gallery-nav {
                padding: 20px !important;
                z-index: 50 !important;
            }
            .image-gallery-left-nav, .image-gallery-right-nav {
                top: 50% !important;
                transform: translateY(-50%) !important;
            }
          `}</style>
          <div className="flex-1 relative h-full w-full">
            <ImageGallery
              items={items}
              startIndex={initialIndex}
              onSlide={handleSlide}
              showThumbnails={true}
              showFullscreenButton={false}
              showPlayButton={false}
              showBullets={false}
              showNav={true}
              lazyLoad={true}
              slideDuration={450}
              flickThreshold={0.4}
              thumbnailPosition="bottom"
              useBrowserFullscreen={false}
              renderCustomControls={() => (
                <div className="absolute top-6 right-6 flex gap-3 z-50 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                    className={`h-10 px-4 rounded-full text-sm font-bold shadow-2xl transition-all active:scale-95 flex items-center gap-2 border ${showInfo ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}
                  >
                    <span>{showInfo ? '📖' : '📘'}</span>
                    <span className="hidden sm:inline">{showInfo ? '隐藏资讯' : '查看资讯'}</span>
                  </button>
                  {onEdit && currentPhoto && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(currentPhoto); }}
                      className="h-10 px-5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold shadow-2xl transition-all active:scale-95 flex items-center gap-2 border border-white/10"
                    >
                      <span className="text-base">✏️</span>
                      <span className="hidden sm:inline">编辑</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="h-10 w-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full shadow-2xl backdrop-blur-xl transition-all active:scale-95 border border-white/10"
                    aria-label="关闭"
                  >
                    <span className="text-xl font-light">✕</span>
                  </button>
                </div>
              )}
              renderItem={(item) => {
                const galleryItem = item as GalleryItem;
                const photoData = galleryItem._data;
                const descriptionObj = photoData?.description;
                const displayDescription = descriptionObj ? (typeof descriptionObj === 'string' ? descriptionObj : (descriptionObj[lang] || descriptionObj.zh || '')) : '';
                const title = galleryItem.originalAlt || 'Photo';
                
                return (
                  <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group">
                    <img 
                      src={galleryItem.original} 
                      alt={title} 
                      className="max-h-full max-w-full object-contain select-none transition-opacity duration-300"
                      loading="lazy"
                      onDragStart={(e) => e.preventDefault()}
                    />
                    
                    {/* Info Panel - Positioned exactly above the thumbnails */}
                    {showInfo && (
                      <div className="absolute bottom-6 left-4 right-4 md:left-10 md:right-auto text-white max-w-xl bg-black/50 rounded-3xl p-6 md:p-8 backdrop-blur-3xl border border-white/10 shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
                        <div className="flex justify-between items-center gap-4 mb-4">
                            <h3 className="text-2xl md:text-3xl font-black tracking-tight truncate pr-4 drop-shadow-lg">{title}</h3>
                            <div className="flex gap-1 bg-white/5 p-1 rounded-xl shrink-0 border border-white/5">
                                {(['zh', 'en', 'ms'] as const).map((l) => (
                                    <button 
                                      key={l} 
                                      onClick={(e) => { e.stopPropagation(); setLang(l); }} 
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lang === l ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {l.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {displayDescription && (
                          <p className="text-sm md:text-base text-white/70 leading-relaxed mb-6 line-clamp-4 font-medium">{displayDescription}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 border-t border-white/10">
                          {(photoData?.category || photoData?.categoryNameZh) && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-widest text-white/30 font-black">Category</span>
                              <span className="text-sm text-blue-400 font-black">{photoData.category || photoData.categoryNameZh}</span>
                            </div>
                          )}
                          {photoData?.tags && photoData.tags.length > 0 && (
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] uppercase tracking-widest text-white/30 font-black">Tags</span>
                              <div className="flex flex-wrap gap-2">
                                {photoData.tags.slice(0, 3).map((tag: any) => (
                                  <span key={typeof tag === 'string' ? tag : (tag.id || tag.name)} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/50 font-bold">
                                    #{typeof tag === 'string' ? tag : tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>
        </div>
      ) : isOpen ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center text-white flex-col gap-6" key="loading">
           <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/5 border-t-blue-500"></div>
           <p className="text-white/40 font-black tracking-widest uppercase text-[10px] animate-pulse">Initializing</p>
           <button onClick={onClose} className="mt-8 px-6 py-2 bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/10">CANCEL</button>
        </div>
      ) : null}
    </Modal>
  );
}
