import * as React from 'react';
import { Modal } from '#src/components/ui/Modal.js';
import { useUI } from '#lib/store/index.js';
import { usePublicSettings } from '#src/hooks/settings/useSettings.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useTranslation, usePhoto } from '#src/hooks/index.js';
import { getEnv } from '#lib/env.js';

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatsAppDialog = ({ open, onOpenChange }: WhatsAppDialogProps) => {
  const { data: settings } = usePublicSettings();
  const pendingPhotoId = useUI(s => s.pendingPhotoId);
  const { data: pendingPhoto } = usePhoto(pendingPhotoId || '');
  const { t } = useTranslation();

  const options = React.useMemo(() => {
    const opts = [];
    const whatsapp1 = typeof settings?.whatsapp1 === 'string' ? settings.whatsapp1.replace(/\D/g, '') : '';
    const whatsapp2 = typeof settings?.whatsapp2 === 'string' ? settings.whatsapp2.replace(/\D/g, '') : '';

    let message = '';
    if (pendingPhoto) {
      const prompt = t('sharePrompt') || "您好，我对这个家具感兴趣：";
      const name = pendingPhoto.name || "";
      const url = pendingPhoto.imageUrl || "";
      message = `${prompt}\n*${name}*\n${url}`;
    } else {
      message = t('inquiryDefaultMessage');
    }
    const encodedText = encodeURIComponent(message);

    if (whatsapp1 && settings?.whatsapp1Name) {
      opts.push({ name: settings.whatsapp1Name, url: `https://wa.me/${whatsapp1}?text=${encodedText}` });
    }
    if (whatsapp2 && settings?.whatsapp2Name) {
      opts.push({ name: settings.whatsapp2Name, url: `https://wa.me/${whatsapp2}?text=${encodedText}` });
    }
    
    // Fallback if no numbers configured but we have an env variable
    if (opts.length === 0) {
      const fallback = getEnv('VITE_WHATSAPP_NUMBER');
      if (fallback) {
        opts.push({ name: t('whatsAppInquiry') || 'WhatsApp', url: `https://wa.me/${fallback.replace(/\D/g, '')}?text=${encodedText}` });
      }
    }

    return opts;
  }, [settings, pendingPhoto, t]);

  return (
    <Modal 
      id="whatsapp-choice-dialog" 
      open={open} 
      onClose={() => onOpenChange(false)}
      title={t('chooseInquiryMethod') || "选择咨询方式"}
    >
      <div className="w-full">
        {options.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-slate-500 text-sm">{t('noInquiryMethods') || "暂无可用咨询方式"}</p>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {options.map((opt, i) => (
              <a 
                key={i}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Small delay to ensure browser starts navigation before component state changes
                  setTimeout(() => onOpenChange(false), 50);
                }}
                className="w-full py-4 px-5 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-between shadow-sm hover:bg-emerald-600 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Icon name="whatsapp" size={20} />
                  </div>
                  <span className="text-base">{opt.name}</span>
                </div>
                <Icon name="external-link" size={16} className="opacity-60" />
              </a>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
