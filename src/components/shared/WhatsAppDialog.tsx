import * as React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { useUI, UIStoreState } from '@/lib/store';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { Icon } from '@/components/ui/Icon';

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatsAppDialog = ({ open, onOpenChange }: WhatsAppDialogProps) => {
  const { data: settings } = usePublicSettings();

  const options = React.useMemo(() => {
    const opts = [];
    if (settings?.whatsapp_1 && settings?.whatsapp_1_name) {
      opts.push({ name: settings.whatsapp_1_name, url: `https://wa.me/${settings.whatsapp_1.replace(/\D/g, '')}` });
    }
    if (settings?.whatsapp_2 && settings?.whatsapp_2_name) {
      opts.push({ name: settings.whatsapp_2_name, url: `https://wa.me/${settings.whatsapp_2.replace(/\D/g, '')}` });
    }
    return opts;
  }, [settings]);

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
