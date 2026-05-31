import React from 'react';
import { GalleryVariant } from '@/types/variant';
import { GalleryFilters } from '@/components/ui/GalleryFilters';

interface GalleryControlsProps {
  onScrollToTop: () => void;
  variant: GalleryVariant;
  handleBatchAiIdentifyTrigger?: () => void;
  isAnalyzing?: boolean;
  batchProgress?: any;
}

export const GalleryControls: React.FC<GalleryControlsProps> = ({
  onScrollToTop,
  variant,
  handleBatchAiIdentifyTrigger,
  isAnalyzing,
  batchProgress,
}) => {
  return (
    <GalleryFilters 
      onScrollToTop={onScrollToTop}
      variant={variant}
      onBatchAiIdentify={handleBatchAiIdentifyTrigger}
      isAnalyzing={isAnalyzing}
      batchProgress={batchProgress}
    />
  );
};
