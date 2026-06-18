import * as React from 'react';
import { X, MessageCircle } from 'lucide-react';
import { AppSettings } from '@/types';
import { Modal } from '@/components/ui/Modal';

interface WhatsAppChoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  options: { name: string; url: string }[];
  onSelect: () => void;
  labels: Record<string, any>;
}

export function WhatsAppChoiceDialog({
  isOpen, onClose, options, onSelect, labels
}: WhatsAppChoiceDialogProps) {
  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="w-full space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">{labels.selectContact}</h3>
        </div>
        <div className="space-y-3 pt-2">
          {options.map((opt, i) => (
            <a 
              key={i}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSelect()}
              className={`w-full py-4 px-6 ${i % 2 === 0 ? 'bg-[#25D366]' : 'bg-[#128C7E]'} text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.98] transition-all`}
            >
              <span className="text-xl shrink-0">{i % 2 === 0 ? '👵' : '🏢'}</span>
              <div className="flex-1 flex flex-col items-start px-2 min-w-0">
                <span className="text-[10px] opacity-70 uppercase tracking-widest">{labels.contactNo} {i + 1}</span>
                <span className="leading-tight truncate w-full text-left">{opt.name}</span>
              </div>
              <MessageCircle size={20} className="shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
}
