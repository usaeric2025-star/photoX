import React from 'react';
import { ImageIcon } from 'lucide-react';

interface GalleryEmptyProps {
  t: any;
}

export const GalleryEmpty: React.FC<GalleryEmptyProps> = ({ t }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-brand-navy/20">
      <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white shadow-sm">
        <ImageIcon size={32} className="opacity-20" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest">{t.empty}</p>
    </div>
  );
};
