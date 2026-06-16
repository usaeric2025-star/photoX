import React from 'react';
import { LogoSection } from './LogoSection';
import { WhatsAppSection } from './WhatsAppSection';
import { AppSettings, Category, Tag, Manufacturer, Photo } from '@/types';
import { useUIStore } from '@/store/useUIStore';

interface GeneralSettingsProps {
  settings: AppSettings;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  photos: Photo[];
  setSettingField: (field: keyof AppSettings, value: any) => void;
  cardClass: string;
  inputClass: string;
  buttonStyles: any;
}

export function GeneralSettings({
  settings, 
  handleLogoUpload, 
  categories, 
  tags, 
  manufacturers,
  photos,
  setSettingField,
  cardClass,
  inputClass,
  buttonStyles
}: GeneralSettingsProps) {
  const uploadAsGroup = useUIStore(s => s.uploadAsGroup);
  const update = useUIStore(s => s.update);

  return (
    <>
      <div className={cardClass}>
        <h3 className="text-sm font-black text-brand-navy uppercase tracking-widest flex items-center gap-2">
          上传设置
        </h3>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={uploadAsGroup}
              onChange={(e) => update({ uploadAsGroup: e.target.checked })} 
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <div className="text-sm font-medium text-slate-700">
            批量上传后自动合组
            <p className="text-xs text-slate-500 font-normal">多张照片同时上传时，将自动创建为一个新的选品组合</p>
          </div>
        </div>
      </div>
      <LogoSection 
        settings={settings}
        handleLogoUpload={handleLogoUpload}
        categories={categories}
        tags={tags}
        manufacturers={manufacturers}
        cardClass={cardClass}
        buttonStyles={buttonStyles}
      />
      <WhatsAppSection 
        settings={settings}
        setSettingField={setSettingField}
        cardClass={cardClass}
        inputClass={inputClass}
      />
    </>
  );
};
