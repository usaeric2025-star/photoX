import React from 'react';
import { ArrowUp, MessageCircle } from 'lucide-react';

interface PublicFloatingActionsProps {
  onScrollToTop?: () => void;
  onWhatsAppClick: () => void;
}

export function PublicFloatingActions({ 
  onScrollToTop, 
  onWhatsAppClick 
}: PublicFloatingActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[var(--z-sticky)]">
      {onScrollToTop && (
        <button
          onClick={onScrollToTop}
          className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors active:scale-[0.98]"
          title="Scroll to Top"
        >
          <ArrowUp size={20} />
        </button>
      )}
      <button
        onClick={onWhatsAppClick}
        className="w-12 h-12 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#20bd5a] transition-colors active:scale-[0.98]"
        title="Contact WhatsApp"
      >
        <MessageCircle size={20} fill="currentColor" />
      </button>
    </div>
  );
};
