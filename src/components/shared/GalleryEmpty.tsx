import React from 'react';
import { ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TranslationType } from '../../types';

interface GalleryEmptyProps {
  t: TranslationType;
}

export function GalleryEmpty({ t }: GalleryEmptyProps) {
  return (
    <EmptyState
      title={t.empty}
      icon={
        <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center border border-white shadow-sm">
          <ImageIcon size={32} className="opacity-20 text-brand-navy/20" />
        </div>
      }
      className="py-20 text-brand-navy/20"
    />
  );
};
