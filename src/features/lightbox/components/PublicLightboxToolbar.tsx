import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { AppSettings } from '@/types';
import { LightboxSlide } from '@/lib/lightbox/types';
import { useTranslation } from '@/hooks/core/useTranslation';
import { motion } from 'lite-sleek';

interface PublicLightboxToolbarProps {
  currentSlide: LightboxSlide;
  settings?: AppSettings;
  onClose: () => void;
}

export function PublicLightboxToolbar({ 
  currentSlide, 
  settings, 
  onClose
}: PublicLightboxToolbarProps) {
  const { uiTranslations: t } = useTranslation();
  return (
    <motion.div 
      variant="slideDown"
      transition="easeOut"
      className="fixed top-4 right-4 flex items-center gap-1.5 p-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto z-[10020] shadow-2xl"
      style={{ isolation: 'isolate' }}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          const text = t.whatsappProductQuery(currentSlide.title || '', `${window.location.origin}/photo/${currentSlide.id}`);
          window.open(`https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`, '_blank');
        }} 
        className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all active:scale-95"
        title={t.whatsappInquiry}
      >
        <Icon name="share-2" size={17} />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
        title={t.close}
      >
        <Icon name="x" size={17} />
      </button>
    </motion.div>
  );
}
