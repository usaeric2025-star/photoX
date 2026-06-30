import React from 'react';
import { AppSettings } from '@/types';

interface AppNameSectionProps {
  settings: AppSettings | null;
  cardClass: string;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  inputClass: string;
}

export function AppNameSection({
  settings,
  cardClass,
  setSettingField,
  inputClass,
}: AppNameSectionProps) {
  return (
    <div className={cardClass} id="section-app-name">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-3 bg-brand-gold rounded-full shrink-0"></div>
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
          基本設定 / General Info
        </h4>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
            <h5 className="text-[11px] font-black text-brand-navy uppercase tracking-tight">網站名稱 / Site Name</h5>
            <p className="text-[9px] text-brand-navy/40 font-bold uppercase tracking-widest leading-none">顯示於標題與選單</p>
        </div>
        <input 
            type="text" 
            className={inputClass}
            placeholder="例如: 我的攝影集"
            value={settings?.appName || ''} 
            onChange={(e) => setSettingField('appName', e.target.value)} 
        />
      </div>
    </div>
  );
}
