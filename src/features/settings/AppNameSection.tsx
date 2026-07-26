import React from 'react';
import { AppSettings } from '#src/types/index.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';

interface AppNameSectionProps {
  settings: AppSettings;
  cardClass: string;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  inputClass: string;
}

/**
 * AppNameSection
 * 
 * 处理应用名称的编辑。
 */
export function AppNameSection({
  settings,
  cardClass,
  setSettingField,
  inputClass,
}: AppNameSectionProps) {
  const text = useSettingsText();

  return (
    <div className={cardClass} id="section-app-name">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-3 bg-brand-gold rounded-full shrink-0"></div>
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
          {text.general.title}
        </h4>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h5 className="text-[11px] font-black text-brand-navy uppercase tracking-tight">{text.general.siteName}</h5>
          <p className="text-[9px] text-brand-navy/40 font-bold uppercase tracking-widest leading-none">{text.general.siteNameHint}</p>
        </div>
        <input 
          id="app-name-input"
          type="text" 
          className={inputClass}
          placeholder="例如: photoX"
          value={settings.appName || ''} 
          onChange={(e) => setSettingField('appName', e.target.value)} 
        />
      </div>
    </div>
  );
}
