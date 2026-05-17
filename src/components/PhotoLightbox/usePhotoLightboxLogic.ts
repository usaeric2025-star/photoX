import { useState, useEffect, useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer, ProductGroup, TranslationType } from '../../types';
import { getCacheBustedImageUrl } from '../../lib/ui-helpers';

interface UsePhotoLightboxLogicProps {
  photo: Photo | null;
  displayPhotos: Photo[];
  index: number | null;
  lang: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const usePhotoLightboxLogic = ({
  photo,
  displayPhotos,
  index,
  lang,
  onPrev,
  onNext,
  onClose
}: UsePhotoLightboxLogicProps) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageError, setIsImageError] = useState(false);
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const [activeLang, setActiveLang] = useState<string>(lang || 'zh');
  const [isCopied, setIsCopied] = useState(false);
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);

  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    setActiveLang(lang || 'zh');
  }, [lang]);

  useEffect(() => {
    setIsImageLoading(true);
    setIsImageError(false);
    
    if (photo?.groupId) {
      setIsGroupDataLoading(true);
      import('../../services/groupService').then(m => {
        m.getGroupById(photo.groupId!).then(data => {
          setGroupData(data);
          setIsGroupDataLoading(false);
        }).catch(() => setIsGroupDataLoading(false));
      });
    } else {
      setGroupData(null);
      setIsGroupDataLoading(false);
    }
  }, [photo?.id, photo?.groupId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onClose]);

  const slides = useMemo(() => {
    return (displayPhotos || [])
      .filter(p => !!p)
      .map(p => ({ src: getCacheBustedImageUrl(p, 'image') }));
  }, [displayPhotos]);

  const handleShare = useCallback(() => {
    if (!photo?.image_hash) return;
    const url = `${window.location.origin}/h/${photo.image_hash}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [photo?.image_hash]);

  const handleDownload = useCallback(async () => {
    const url = photo?.image_url || photo?.uri;
    if (!url) return;
    
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = photo?.name || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  }, [photo]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]?.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0]?.clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  };

  const retryImageLoad = () => {
    setIsImageError(false);
    setIsImageLoading(true);
  };

  return {
    isZoomed, setIsZoomed,
    isImageLoading, setIsImageLoading,
    isImageError, setIsImageError,
    groupData, setGroupData,
    activeLang, setActiveLang,
    isCopied, setIsCopied,
    isGroupDataLoading,
    slides,
    handleShare,
    handleDownload,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    retryImageLoad
  };
};
