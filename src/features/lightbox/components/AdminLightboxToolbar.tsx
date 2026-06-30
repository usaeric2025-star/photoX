import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { AppSettings } from '@/types';
import { LightboxSlide } from '@/lib/lightbox/types';
import { useTranslation } from '@/hooks/core/useTranslation';
import { motion } from 'lite-sleek';

interface AdminLightboxToolbarProps {
  currentSlide: LightboxSlide;
  settings?: AppSettings;
  onClose: () => void;
  onEdit: () => void;
  onAiAnalyze: () => void;
  onDelete: () => void;
}

export function AdminLightboxToolbar({ 
  currentSlide, 
  settings, 
  onClose,
  onEdit,
  onAiAnalyze,
  onDelete
}: AdminLightboxToolbarProps) {
  const { uiTranslations: t } = useTranslation();
  return (
    <motion.div 
      variant="slideDown"
      transition="easeOut"
      className="fixed top-4 right-4 flex items-center gap-1.5 p-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto z-[10020] shadow-2xl"
      style={{ isolation: 'isolate' }}
    >
      <div className="flex items-center gap-1 border-r border-white/10 pr-1.5 mr-1 bg-white/5 rounded-full py-0.5 pl-1">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="w-9 h-9 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
          title={t.editPhoto}
        >
          <Icon name="pencil" size={17} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onAiAnalyze(); }}
          className="w-9 h-9 flex items-center justify-center rounded-full text-purple-400 hover:bg-white/10 transition-colors"
          title={t.aiAnalyze}
        >
          <Icon name="sparkles" size={17} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="w-9 h-9 flex items-center justify-center rounded-full text-red-400 hover:bg-white/10 transition-colors"
          title={t.delete}
        >
          <Icon name="trash-2" size={17} />
        </button>
      </div>

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
