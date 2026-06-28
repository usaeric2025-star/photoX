import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { Category, Tag, Manufacturer, AppSettings } from '@/types';

interface LogoSectionProps {
  settings: AppSettings | null;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  cardClass: string;
  buttonStyles: { secondary: string };
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  inputClass: string;
}

export function LogoSection({
  settings,
  handleLogoUpload,
  categories,
  tags,
  manufacturers,
  cardClass,
  buttonStyles,
  setSettingField,
  inputClass,
}: LogoSectionProps) {
  return (
    <div className={cardClass} id="section-logo">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-3 bg-brand-gold rounded-full shrink-0"></div>
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
          品牌識別 / Brand Identity
        </h4>
      </div>
      
      <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-gold/20 to-transparent rounded-[36px] blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            {settings?.logo_url && settings.logo_url.trim() !== '' ? (
                <img src={settings.logo_url} className="relative w-20 h-20 rounded-[32px] object-cover shadow-2xl border-4 border-white p-1 bg-white" alt="Logo" loading="lazy" />
            ) : (
                <div className="relative w-20 h-20 bg-slate-50 rounded-[32px] flex flex-col items-center justify-center text-brand-navy/10 border border-brand-navy/5">
                  <Icon name="image" size={24} />
                </div>
            )}
          </div>
          <div className="flex flex-col gap-3 flex-1">
            <div className="space-y-1">
              <h5 className="text-[11px] font-black text-brand-navy uppercase tracking-tight">商戶 Logo / Store Logo</h5>
              <p className="text-[9px] text-brand-navy/40 font-bold uppercase tracking-widest leading-none">推薦比例 1:1 · 透明背景為佳</p>
            </div>
            <label className="relative overflow-hidden inline-block self-start">
              <span className="px-6 py-2.5 bg-brand-gold text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-brand-gold/90 transition-colors cursor-pointer shadow-lg shadow-brand-gold/20">
                <Icon name="upload" size={14} /> 上傳新圖標
              </span>
              <input 
                type="file" 
                onChange={handleLogoUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept="image/*" 
              />
            </label>
          </div>
      </div>

      <div className="space-y-2 mt-4 pt-4 border-t border-brand-navy/5">
        <label className="text-[9px] font-black text-brand-navy/50 uppercase tracking-widest pl-1">
          商戶名稱 / Store Name
        </label>
        <input 
          type="text" 
          placeholder="商戶名稱 / Store Name" 
          className={`${inputClass} w-full`} 
          value={settings?.app_name || ''} 
          onChange={(e) => setSettingField('app_name', e.target.value)} 
        />
      </div>
    </div>
  );
};
