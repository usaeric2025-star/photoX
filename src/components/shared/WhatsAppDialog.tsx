import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useUIStore } from '@/store/useUIStore';
import { MessageCircle } from 'lucide-react';

export const WhatsAppDialog = () => {
  const show = useUIStore((s) => s.showWhatsAppChoice);
  const update = useUIStore((s) => s.update);

  const options = [
    { name: '客服 1', url: 'https://wa.me/1234567890' },
    { name: '客服 2', url: 'https://wa.me/0987654321' },
  ];

  return (
    <Modal open={!!show} onClose={() => update({ showWhatsAppChoice: false })}>
      <div className="w-full p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-800">选择咨询方式</h3>
        <div className="space-y-3">
          {options.map((opt, i) => (
            <a 
              key={i}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => update({ showWhatsAppChoice: false })}
              className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-between shadow-sm hover:bg-emerald-700 transition-all"
            >
              <span>{opt.name}</span>
              <MessageCircle size={18} />
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
};
