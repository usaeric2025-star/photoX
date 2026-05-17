import React from 'react';
import { ArrowUpToLine, MessageCircle } from 'lucide-react';

interface GalleryFloatButtonsProps {
  scrollToTop: () => void;
  setShowWhatsAppChoice: (show: boolean) => void;
}

export const GalleryFloatButtons: React.FC<GalleryFloatButtonsProps> = ({ scrollToTop, setShowWhatsAppChoice }) => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[400]">
      <button onClick={scrollToTop} className="bg-brand-navy text-brand-bg p-3 rounded-full shadow-lg transition-all active:scale-95 border border-brand-navy/10"><ArrowUpToLine size={20} /></button>
      <button onClick={() => setShowWhatsAppChoice(true)} className="bg-[#25D366] text-white p-3 rounded-full shadow-lg"><MessageCircle size={20} /></button>
    </div>
  );
};
