import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { AppSettings } from '@/types';
import { translations } from '@/locales';
import { useUIStore } from '@/store/useUIStore';

interface SocialLinksSectionProps {
  settings: AppSettings;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

export function SocialLinksSection({
  settings,
  setSettingField,
  cardClass,
  inputClass
}: SocialLinksSectionProps) {
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  return (
    <section className={cardClass}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
          <Icon name="link" size={18} />
        </div>
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider">
          {appLang === 'zh' ? '社交媒体链接' : 'Social Media Links'}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest px-1">
            Facebook URL
          </label>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] shrink-0">
              <Icon name="facebook" size={20} />
            </div>
            <input 
              type="text"
              value={settings.facebook || ''}
              onChange={(e) => setSettingField('facebook', e.target.value)}
              className={inputClass}
              placeholder="https://facebook.com/yourpage"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest px-1">
            Instagram URL
          </label>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#E4405F]/10 flex items-center justify-center text-[#E4405F] shrink-0">
              <Icon name="instagram" size={20} />
            </div>
            <input 
              type="text"
              value={settings.instagram || ''}
              onChange={(e) => setSettingField('instagram', e.target.value)}
              className={inputClass}
              placeholder="https://instagram.com/yourprofile"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
