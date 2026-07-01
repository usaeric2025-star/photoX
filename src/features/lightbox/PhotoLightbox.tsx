import { useMemo, useState, useEffect } from 'react';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/image-gallery.css';
import { Photo } from '@/types';
import { useLightbox } from '@/lib/lightbox';
import { useFilters } from '@/features/filters';
import { Modal } from '@/components/ui/Modal';
import { usePermission } from '@/hooks/core/auth/usePermission';
import { toast } from 'sonner';
import { getThumbnailUrl } from '@/services/mappers/utils';

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
  const { isAdmin } = usePermission();
  
  const onEdit = props.onEdit || ((photo: any) => {
    setPhotoId(photo.id);
    setModal('edit');
  });

  const [showInfo, setShowInfo] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');

  // Stable key: Only changes when the lightbox opens/closes or if the photo set itself changes
  const galleryKey = useMemo(() => `gallery-${isOpen}-${photos.length}`, [isOpen, photos.length]);

  const items = useMemo(() => 
    photos.map((p: any): GalleryItem => {
      // Handle LightboxSlide vs raw Photo
      const photo = p.original || p;
      const key = photo.imageUrl || photo.uri || p.src;
      const src = getThumbnailUrl(key, 800) || key;
      const thumb = getThumbnailUrl(key, 120) || key;
      const title = p.title || photo.name || 'Photo';

      return {
        original: src,
        thumbnail: thumb,
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
  
  // Calculate display properties for the current active photo
  const currentPhotoInfo = useMemo(() => {
    if (!currentPhoto) return null;
    const photoData = (currentPhoto.original || currentPhoto) as any;
    const descriptionObj = photoData?.description;
    const displayDescription = descriptionObj ? (typeof descriptionObj === 'string' ? descriptionObj : (descriptionObj[lang] || descriptionObj.zh || '')) : '';
    const title = (currentPhoto as any).title || photoData.name || 'Photo';
    const uuid = photoData.id || 'N/A';
    return { title, displayDescription, photoData, uuid };
  }, [currentPhoto, lang]);

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
              height: 100dvh;
              display: flex;
              flex-direction: column;
              background: black;
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
              background: black;
            }
            .image-gallery-swipe {
              height: 100% !important;
              width: 100% !important;
              transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .image-gallery-slides {
              height: 100% !important;
              width: 100% !important;
              background: black !important;
            }
            .image-gallery-slide {
              height: 100% !important;
              width: 100% !important;
              background: black !important;
            }
            .image-gallery-slide > div {
              height: 100% !important;
              width: 100% !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 0 !important;
              background: black !important;
            }
            .image-gallery-slide .image-gallery-image {
              max-width: 100% !important;
              max-height: 100% !important;
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
              display: block !important;
              user-select: none;
              margin: auto !important;
            }
            .image-gallery-thumbnails-wrapper {
              background: #000 !important;
              padding: 16px 0 !important;
              border-top: 1px solid rgba(255,255,255,0.08);
              z-index: 30 !important;
            }
            .image-gallery-thumbnail {
              width: 60px !important;
              height: 40px !important;
              border: 2px solid transparent !important;
              border-radius: 8px !important;
              overflow: hidden !important;
              transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1) !important;
              margin: 0 4px !important;
              background: #0a0a0a !important;
              opacity: 0.3;
            }
            .image-gallery-thumbnail.active {
              border-color: #3b82f6 !important;
              transform: translateY(-2px) scale(1.05);
              opacity: 1;
              box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
            }
            .image-gallery-icon {
                filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5)) !important;
                transition: all 0.3s ease !important;
                color: rgba(255,255,255,0.5) !important;
            }
            .image-gallery-icon:hover {
                color: #fff !important;
                transform: scale(1.1);
            }
            .image-gallery-nav {
                padding: 10px !important;
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
              slideDuration={600}
              thumbnailPosition="bottom"
              useBrowserFullscreen={false}
              renderCustomControls={() => (
                <>
                  {/* Top Right: System Controls */}
                  <div className="absolute top-6 right-6 flex items-center gap-3 z-50 pointer-events-auto">
                    {isAdmin && onEdit && currentPhoto && (
                       <button
                         onClick={(e) => { e.stopPropagation(); onEdit(currentPhoto); }}
                         className="h-10 px-4 bg-white/5 hover:bg-blue-600 text-white rounded-xl text-[10px] font-bold tracking-[0.2em] shadow-xl backdrop-blur-xl transition-all active:scale-95 flex items-center gap-2 border border-white/5 uppercase"
                       >
                         <span className="text-sm">✏️</span>
                         <span className="hidden sm:inline">Admin Edit</span>
                       </button>
                    )}
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl shadow-xl backdrop-blur-xl transition-all active:scale-95 border border-white/5"
                    >
                      <span className="text-xl font-light">✕</span>
                    </button>
                  </div>

                  {/* Bottom Right: Info Toggle Button - Floating snug above thumbnails */}
                  <div className="absolute bottom-[82px] right-4 z-50 pointer-events-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                      className={`h-11 w-11 rounded-full shadow-2xl transition-all active:scale-90 flex items-center justify-center border backdrop-blur-2xl ${showInfo ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/60 border-white/10 text-white/60 hover:text-white hover:bg-black/80'}`}
                      title={showInfo ? 'Hide Information' : 'Show Information'}
                    >
                      <span className="text-lg">{showInfo ? '📖' : '📘'}</span>
                    </button>
                  </div>

                  {/* Info Panel - Sleek Floating Sidebar above thumbnails */}
                  {showInfo && currentPhotoInfo && (
                    <div className="absolute bottom-[82px] left-4 top-4 max-h-[calc(100%-102px)] w-[calc(100%-32px)] sm:w-[320px] z-40 pointer-events-none animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="h-full bg-black/50 backdrop-blur-3xl border border-white/10 rounded-[24px] overflow-hidden flex flex-col pointer-events-auto shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                          <div className="flex flex-col gap-6">
                            {/* Title & Shortened ID */}
                            <div className="flex flex-col gap-3">
                              <h3 className="text-xl md:text-2xl font-black tracking-tight leading-tight text-white">{currentPhotoInfo.title}</h3>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Product ID</span>
                                <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                  <span className="text-[10px] font-mono text-white/60 tracking-wider font-bold">#{currentPhotoInfo.uuid.slice(-4).toUpperCase()}</span>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      navigator.clipboard.writeText(currentPhotoInfo.uuid);
                                      toast.success('ID Copied');
                                    }}
                                    className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-all active:scale-90"
                                    title="Copy Full ID"
                                  >
                                    <span className="text-[10px]">📋</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Description Section */}
                            {currentPhotoInfo.displayDescription && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Description</span>
                                <p className="text-xs md:text-sm text-white/50 leading-relaxed font-medium">
                                  {currentPhotoInfo.displayDescription}
                                </p>
                              </div>
                            )}

                            {/* Metadata Section */}
                            <div className="flex flex-col gap-4 pt-5 border-t border-white/5">
                              {(currentPhotoInfo.photoData?.category || currentPhotoInfo.photoData?.categoryNameZh) && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Collection</span>
                                  <span className="text-xs md:text-sm text-blue-400 font-bold">{currentPhotoInfo.photoData.category || currentPhotoInfo.photoData.categoryNameZh}</span>
                                </div>
                              )}
                              
                              {currentPhotoInfo.photoData?.tags && currentPhotoInfo.photoData.tags.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Labels</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {currentPhotoInfo.photoData.tags.map((tag: any) => (
                                      <span key={typeof tag === 'string' ? tag : (tag.id || tag.name)} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] text-white/40 font-bold transition-colors hover:text-white hover:bg-white/10">
                                        #{typeof tag === 'string' ? tag : tag.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Language Switcher at Bottom */}
                        <div className="p-5 bg-white/5 border-t border-white/5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Language</span>
                            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                              {(['zh', 'en', 'ms'] as const).map((l) => (
                                <button 
                                  key={l} 
                                  onClick={(e) => { e.stopPropagation(); setLang(l); }} 
                                  className={`px-2.5 py-1 rounded-lg text-[8px] font-black transition-all ${lang === l ? 'bg-white text-black shadow-lg' : 'text-white/30 hover:text-white'}`}
                                >
                                  {l.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              renderItem={(item) => {
                const galleryItem = item as GalleryItem;
                const photoData = galleryItem._data;
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
                  </div>
                );
              }}
            />
          </div>
        </div>
      ) : isOpen ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center text-white flex-col gap-8" key="loading">
           <div className="relative">
             <div className="absolute inset-0 blur-3xl bg-blue-500/30 rounded-full animate-pulse" />
             <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-white/5 border-t-blue-500 relative z-10"></div>
           </div>
           <p className="text-white/30 font-black tracking-[0.4em] uppercase text-[11px] animate-pulse">Initializing</p>
           <button onClick={onClose} className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[11px] font-black tracking-widest transition-all border border-white/10 uppercase">Cancel</button>
        </div>
      ) : null}
    </Modal>
  );
}
