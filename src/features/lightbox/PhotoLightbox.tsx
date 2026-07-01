import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'lite-sleek';
import { Icon } from '@/components/ui/Icon';
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

  const [localIndex, setLocalIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');

  // Keep local index in sync with initial index when opening
  useEffect(() => {
    if (isOpen) {
      setLocalIndex(initialIndex);
      setShowInfo(false);
    }
  }, [isOpen, initialIndex]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    const nextIdx = (localIndex + 1) % photos.length;
    setLocalIndex(nextIdx);
    setLightboxIndex(nextIdx);
  }, [photos.length, localIndex, setLightboxIndex]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    const prevIdx = (localIndex - 1 + photos.length) % photos.length;
    setLocalIndex(prevIdx);
    setLightboxIndex(prevIdx);
  }, [photos.length, localIndex, setLightboxIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  const currentPhoto = photos[localIndex];
  
  const currentInfo = useMemo(() => {
    if (!currentPhoto) return null;
    const photoData = (currentPhoto.original || currentPhoto) as any;
    const descriptionObj = photoData?.description;
    const displayDescription = descriptionObj ? (typeof descriptionObj === 'string' ? descriptionObj : (descriptionObj[lang] || descriptionObj.zh || '')) : '';
    const title = (currentPhoto as any).title || photoData.name || 'Photo';
    const uuid = photoData.id || 'N/A';
    
    // Key extraction
    const key = photoData.imageUrl || photoData.uri || (currentPhoto as any).src;
    // For Lightbox, we use high quality (1200px width)
    const src = getThumbnailUrl(key, 1200) || key;
    
    return { title, displayDescription, photoData, uuid, src };
  }, [currentPhoto, lang]);

  if (!isOpen) return null;

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
      <div className="fixed inset-0 bg-black flex flex-col z-[100] outline-none" tabIndex={0}>
        {/* Top Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-[150] flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-black/40 hover:bg-black/80 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white transition-all active:scale-90 pointer-events-auto shadow-2xl group"
            >
              <Icon name="x" className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
            {isAdmin && currentInfo && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(currentInfo.photoData); }}
                className="h-10 sm:h-12 px-4 sm:px-6 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-2xl backdrop-blur-xl transition-all active:scale-95 flex items-center gap-2 border border-blue-500/20 uppercase group"
              >
                <Icon name="pencil" size={14} className="group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Admin Editor</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Stage: Image and Navigation */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <AnimatePresence>
            {currentInfo ? (
              <motion.div
                key={currentInfo.src}
                initial={{ opacity: 0, transform: 'scale(0.98)' }}
                animate={{ opacity: 1, transform: 'scale(1)' }}
                exit={{ opacity: 0, transform: 'scale(1.02)' }}
                transition="all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                className="w-full h-full flex items-center justify-center p-4 sm:p-12 md:p-16"
              >
                <img 
                  src={currentInfo.src} 
                  alt={currentInfo.title}
                  className="max-w-full max-h-full object-contain shadow-[0_32px_120px_rgba(0,0,0,0.7)] select-none pointer-events-none rounded-sm"
                  onDragStart={(e) => e.preventDefault()}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-6 animate-pulse">
                 <div className="h-16 w-16 rounded-full border-2 border-white/5 border-t-blue-500 animate-spin" />
                 <span className="text-white/20 font-black uppercase tracking-[0.4em] text-[10px]">Loading Asset</span>
              </div>
            )}
          </AnimatePresence>

          {/* Luxury Navigation Arrows */}
          {photos.length > 1 && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-4 sm:px-10 pointer-events-none z-[140]">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all border border-white/5 hover:border-white/20 backdrop-blur-md pointer-events-auto group active:scale-90"
              >
                <Icon name="chevron-left" size={32} className="sm:w-10 sm:h-10 group-hover:-translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all border border-white/5 hover:border-white/20 backdrop-blur-md pointer-events-auto group active:scale-90"
              >
                <Icon name="chevron-right" size={32} className="sm:w-10 sm:h-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Strip: Thumbnails */}
        <div className="h-[90px] bg-black/95 border-t border-white/5 flex items-center justify-center z-[130] px-4">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-7xl py-2">
            {photos.map((p, idx) => {
              const photoData = (p.original || p) as any;
              const key = photoData.imageUrl || photoData.uri || (p as any).src;
              const thumb = getThumbnailUrl(key, 120) || key;
              const isActive = idx === localIndex;
              return (
                <button
                  key={`${key}-${idx}`}
                  onClick={() => setLocalIndex(idx)}
                  className={`flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all duration-500 ${isActive ? 'border-blue-500 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.3)] opacity-100 z-10' : 'border-transparent opacity-20 hover:opacity-50 hover:scale-105'}`}
                >
                  <img src={thumb} className="w-full h-full object-cover" alt="" loading="lazy" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Trigger - Styled Snug */}
        <div className="absolute bottom-[110px] right-6 z-[160]">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`h-14 w-14 rounded-full shadow-2xl transition-all active:scale-95 flex items-center justify-center border backdrop-blur-2xl ${showInfo ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/60 border-white/20 text-white hover:bg-blue-600 hover:border-blue-400'}`}
          >
            {showInfo ? <Icon name="book-open" className="w-6 h-6" /> : <Icon name="book" className="w-6 h-6" />}
          </button>
        </div>

        {/* Floating Info Panel with Integrated Language Switcher */}
        <AnimatePresence>
          {showInfo && currentInfo && (
            <motion.div 
              initial={{ transform: 'translateX(-40px)', opacity: 0 }}
              animate={{ transform: 'translateX(0)', opacity: 1 }}
              exit={{ transform: 'translateX(-40px)', opacity: 0 }}
              transition="all 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
              className="absolute bottom-[110px] left-6 top-6 max-h-[calc(100%-160px)] w-[calc(100%-48px)] sm:w-[380px] z-[155] pointer-events-none"
            >
              <div className="h-full bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden flex flex-col pointer-events-auto shadow-[0_32px_120px_rgba(0,0,0,0.8)]">
                <div className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar">
                  <div className="flex flex-col gap-8">
                    {/* Header: Title and Language Switcher */}
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                          <Icon name="languages" size={12} />
                          Translation
                        </span>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-0.5 flex items-center">
                          {(['zh', 'en', 'ms'] as const).map((l) => (
                            <button
                              key={l}
                              onClick={() => setLang(l)}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${lang === l ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-[1.1]">{currentInfo.title}</h3>
                        <div 
                          onClick={() => { 
                            navigator.clipboard.writeText(currentInfo.uuid);
                            toast.success('Full ID Copied');
                          }}
                          className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10 hover:bg-white/10 cursor-pointer transition-all w-fit group"
                        >
                          <span className="text-[10px] font-mono text-white/30 font-bold uppercase tracking-[0.2em] group-hover:text-white/60 transition-colors">#{currentInfo.uuid.slice(-4).toUpperCase()}</span>
                          <Icon name="copy" size={14} className="opacity-30 group-hover:opacity-100 transition-opacity text-white" />
                        </div>
                      </div>
                    </div>

                    {currentInfo.displayDescription && (
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Product Details</span>
                        <p className="text-sm sm:text-base leading-relaxed text-white/70 font-medium whitespace-pre-wrap">{currentInfo.displayDescription}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-6 pt-8 border-t border-white/5 mt-2">
                      {(currentInfo.photoData?.category || currentInfo.photoData?.categoryNameZh) && (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Collection</span>
                          <span className="text-sm font-bold text-blue-400">{currentInfo.photoData.category || currentInfo.photoData.categoryNameZh}</span>
                        </div>
                      )}
                      
                      {currentInfo.photoData?.tags && currentInfo.photoData.tags.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Labels</span>
                          <div className="flex flex-wrap gap-2">
                            {currentInfo.photoData.tags.map((tag: any) => (
                              <span key={typeof tag === 'string' ? tag : (tag.id || tag.name)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/40 font-black uppercase tracking-wider hover:text-white transition-colors cursor-default">
                                #{typeof tag === 'string' ? tag : tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
