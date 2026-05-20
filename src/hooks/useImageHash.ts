import { useCallback } from 'react';
import { processImageFile } from '@/utils/imageProcess';
import { useFeedback } from '@/hooks';

export const useImageHash = () => {
  const { handleError } = useFeedback();
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
