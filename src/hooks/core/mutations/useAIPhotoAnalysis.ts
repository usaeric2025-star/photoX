import { useCallback } from 'react';
import type { Photo } from '@/types';

export function useAIPhotoAnalysis() {
  const analyzePhoto = useCallback(async (photo: Photo) => {
    // Placeholder, actually we'd want what the user specified, or maybe we can import the original if there is a way.
  }, []);

  return analyzePhoto;
}
