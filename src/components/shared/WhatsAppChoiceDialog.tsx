import * as React from 'react';
import { X, MessageCircle } from 'lucide-react';
import { AppSettings } from '@/types';
import { Modal } from '@/components/ui/Modal';

interface WhatsAppChoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSelect: (num: string) => void;
  labels: Record<string, any>;
}

export function WhatsAppChoiceDialog({
  isOpen, onClose, settings, onSelect, labels
}: WhatsAppChoiceDialogProps) {
  const fallback = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_WHATSAPP_NUMBER : '';

  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="w-full space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">{labels.selectContact}</h3>
        </div>
        <div className="space-y-3 pt-2">
          {settings?.whatsapp_1 && (
            <button 
              onClick={() => onSelect(settings.whatsapp_1!)}
              className="w-full py-4 px-6 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              <span className="text-xl shrink-0">👵</span>
              <div className="flex-1 flex flex-col items-start px-2 min-w-0">
                <span className="text-[10px] opacity-70 uppercase tracking-widest">{labels.contactNo} 1</span>
                <span className="leading-tight truncate w-full text-left">{settings.whatsapp_1_name || 'Contact 1'}</span>
              </div>
              <MessageCircle size={20} className="shrink-0" />
            </button>
          )}
          {settings?.whatsapp_2 && (
            <button 
              onClick={() => onSelect(settings.whatsapp_2!)}
              className="w-full py-4 px-6 bg-[#128C7E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              <span className="text-xl shrink-0">🏢</span>
              <div className="flex-1 flex flex-col items-start px-2 min-w-0">
                <span className="text-[10px] opacity-70 uppercase tracking-widest">{labels.contactNo} 2</span>
                <span className="leading-tight truncate w-full text-left">{settings.whatsapp_2_name || 'Contact 2'}</span>
              </div>
              <MessageCircle size={20} className="shrink-0" />
            </button>
          )}
          {!settings?.whatsapp_1 && !settings?.whatsapp_2 && fallback && (
            <button 
              onClick={() => onSelect(fallback)}
              className="w-full py-4 px-6 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              <MessageCircle size={20} className="shrink-0" />
              <span className="flex-1 text-left">{labels.whatsAppInquiry}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
