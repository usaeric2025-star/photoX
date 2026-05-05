import React from 'react';
import { motion } from 'motion/react';
import { X, MessageCircle } from 'lucide-react';

import { AppSettings } from '../types';

interface WhatsAppChoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSelect: (num: string) => void;
  t: Record<string, any>;
}

export const WhatsAppChoiceDialog: React.FC<WhatsAppChoiceDialogProps> = ({
  isOpen, onClose, settings, onSelect, t
}) => {
  if (!isOpen) return null;

  const fallback = (import.meta as any).env.VITE_WHATSAPP_NUMBER;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-end justify-center p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100 }} 
        animate={{ y: 0 }} 
        exit={{ y: 100 }}
        className="w-full max-w-sm bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-slate-800">{t.selectContact}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-3">
          {settings?.whatsapp_1 && (
            <button 
              onClick={() => onSelect(settings.whatsapp_1)}
              className="w-full py-4 px-6 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <span className="text-xl">👵</span>
              <div className="flex-1 flex flex-col items-start px-2">
                <span className="text-[10px] opacity-70 uppercase tracking-widest">{t.contactNo} 1</span>
                <span className="leading-tight truncate w-full text-left">{settings.whatsapp_1_name || 'Contact 1'}</span>
              </div>
              <MessageCircle size={20} className="shrink-0" />
            </button>
          )}
          {settings?.whatsapp_2 && (
            <button 
              onClick={() => onSelect(settings.whatsapp_2)}
              className="w-full py-4 px-6 bg-[#128C7E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <span className="text-xl">🏢</span>
              <div className="flex-1 flex flex-col items-start px-2">
                <span className="text-[10px] opacity-70 uppercase tracking-widest">{t.contactNo} 2</span>
                <span className="leading-tight truncate w-full text-left">{settings.whatsapp_2_name || 'Contact 2'}</span>
              </div>
              <MessageCircle size={20} className="shrink-0" />
            </button>
          )}
          {!settings?.whatsapp_1 && !settings?.whatsapp_2 && fallback && (
            <button 
              onClick={() => onSelect(fallback)}
              className="w-full py-4 px-6 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <MessageCircle size={20} />
              <span>{t.whatsAppInquiry}</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
