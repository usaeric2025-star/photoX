import React from 'react';
import { ArrowUpToLine, MessageCircle } from 'lucide-react';

interface GalleryFloatButtonsProps {
  scrollToTop: () => void;
  setShowWhatsAppChoice: (show: boolean) => void;
}

export const GalleryFloatButtons: React.FC<GalleryFloatButtonsProps> = ({ scrollToTop, setShowWhatsAppChoice }) => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[400]">
      <button onClick={scrollToTop} className="w-12 h-12 flex items-center justify-center bg-brand-navy text-white rounded-2xl shadow-2xl border border-white/10 transition-all active:scale-95">
        <ArrowUpToLine size={20} />
      </button>
      <button onClick={() => setShowWhatsAppChoice(true)} className="w-12 h-12 flex items-center justify-center bg-[#25D366] text-white rounded-2xl shadow-2xl border border-white/10 transition-all active:scale-95">
        <MessageCircle size={20} />
      </button>
    </div>
  );
};
