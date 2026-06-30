import * as React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { useUI, UIStoreState } from '@/lib/store';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks';

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatsAppDialog = ({ open, onOpenChange }: WhatsAppDialogProps) => {
  const { data: settings } = usePublicSettings();
  const pendingPhoto = useUI(s => s.pendingPhoto);
  const { uiTranslations: t } = useTranslation();

  const options = React.useMemo(() => {
    const opts = [];
    const whatsapp1 = typeof settings?.whatsapp1 === 'string' ? settings.whatsapp1.replace(/\D/g, '') : '';
    const whatsapp2 = typeof settings?.whatsapp2 === 'string' ? settings.whatsapp2.replace(/\D/g, '') : '';

    let message = '';
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const name = pendingPhoto.name || "";
      const url = pendingPhoto.imageUrl || "";
      message = `${prompt}\n*${name}*\n${url}`;
    } else {
      message = `您好，我想了解更多信息！`;
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
      const fallback = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_WHATSAPP_NUMBER : '';
      if (fallback) {
        opts.push({ name: t.whatsAppInquiry || 'WhatsApp', url: `https://wa.me/${fallback.replace(/\D/g, '')}?text=${encodedText}` });
      }
    }

    return opts;
  }, [settings, pendingPhoto, t]);

  return (
    <NativeDialog id="whatsapp-choice-dialog" open={open} onClose={() => onOpenChange(false)}>
      <div className="w-full p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-800">选择咨询方式</h3>
        {options.length === 0 ? (
          <p className="text-slate-500 text-sm">暂无设置咨询方式</p>
        ) : (
          <div className="space-y-3">
            {options.map((opt, i) => (
              <a 
                key={i}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpenChange(false)}
                className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-between shadow-sm hover:bg-emerald-700 transition-all"
              >
                <span>{opt.name}</span>
                {i === 0 ? <Icon name="heart" size={18} /> : <Icon name="sparkles" size={18} />}
              </a>
            ))}
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
