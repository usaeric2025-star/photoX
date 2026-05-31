import { useCallback } from 'react';
import { processImageFile } from '@/lib/image/imageProcess';
import { useToast } from '@/hooks';

export const usePhotoFingerprint = () => {
  const { handleError } = useToast();
  const getHashAndDataUrl = useCallback(async (file: File) => {
    try {
      const { hash, dataUrl } = await processImageFile(file);
      return { hash, dataUrl };
    } catch (error) {
      handleError(error, '处理图片哈希失败');
      throw error;
    }
  }, [handleError]);

  return { getHashAndDataUrl };
};

export const useImageHash = usePhotoFingerprint;
