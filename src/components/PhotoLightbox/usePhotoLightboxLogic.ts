import { useState, useEffect, useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer, ProductGroup, TranslationType } from '../../types';
import { getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { useFeedback, useTasks, useTaskExecutor } from '../../hooks';
import { getGroupById } from '@/services/group/queries';
import { isOk } from '@/lib/errorFactory';
import { usePhotoDetail } from '@/hooks/core/queries/usePhotoDetail';

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
  const { showError } = useFeedback();
  const [isZoomed, setIsZoomed] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageError, setIsImageError] = useState(false);
  
  const { data: detailData, isLoading: isDetailLoading } = usePhotoDetail(photo?.id || '');
  const activePhoto = detailData ?? photo;
  
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const [activeLang, setActiveLang] = useState<string>(lang || 'en');
  const [isCopied, setIsCopied] = useState(false);
  const { runTask } = useTaskExecutor();
  const { isTaskRunning } = useTasks();
  const isGroupDataLoading = isTaskRunning('获取产品组数据');
  
  // Swipe support
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const minSwipeDistance = 50;
  const minVerticalSwipeDistance = 80;

  useEffect(() => {
    setActiveLang(lang || 'en');
  }, [lang]);

  useEffect(() => {
    setIsImageLoading(true);
    setIsImageError(false);
    
    if (activePhoto?.group_id) {
      runTask('获取产品组数据', async () => {
        const result = await getGroupById(activePhoto.group_id!);
        const data = isOk(result) ? result.data : null;
        setGroupData(data);
      }, { silent: true });
    } else {
      setGroupData(null);
    }
  }, [activePhoto?.id, activePhoto?.group_id, runTask]);

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
    }).catch(err => {
      showError(err, '复制链接失败');
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
      showError(err, '下载图片失败');
    }
  }, [photo]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0]?.clientX);
    setTouchStartY(e.targetTouches[0]?.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0]?.clientX);
    setTouchEndY(e.targetTouches[0]?.clientY);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) return;
    
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;
    
    const absX = Math.abs(distanceX);
    const absY = Math.abs(distanceY);
    
    // Horizontal swipe is dominant and exceeds swipe distance threshold
    if (absX > absY && absX > minSwipeDistance) {
      if (distanceX > 0) {
        onNext();
      } else {
        onPrev();
      }
    } 
    // Vertical swipe is dominant and exceeds vertical swipe distance threshold
    else if (absY > absX && absY > minVerticalSwipeDistance) {
      onClose();
    }
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
    retryImageLoad,
    activePhoto
  };
};
