import React from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Category, Tag, Manufacturer, AppSettings } from '../../types';

interface LogoSectionProps {
  settings: AppSettings | null;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, categories: Category[], tags: Tag[], manufacturers: Manufacturer[]) => Promise<void>;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  cardClass: string;
  buttonStyles: { secondary: string };
}

export const LogoSection: React.FC<LogoSectionProps> = ({
  settings,
  handleLogoUpload,
  categories,
  tags,
  manufacturers,
  cardClass,
  buttonStyles
}) => {
  return (
    <div className={cardClass} id="section-logo">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-3.5 bg-brand-gold rounded-full shrink-0"></div>
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest leading-none pt-0.5">
          Logo 设置 / Logo Settings
        </h4>
      </div>
      
      <div className="flex items-center gap-5 pt-2">
          <div className="relative group">
            {settings?.logo_url ? (
                <img src={settings.logo_url} className="w-16 h-16 rounded-3xl object-cover shadow-md border-2 border-white p-1 bg-white" alt="Logo" />
            ) : (
                <div className="w-16 h-16 bg-brand-navy/5 rounded-3xl flex flex-col items-center justify-center text-brand-navy/20 shadow-inner border border-brand-navy/10 italic">
                  <ImageIcon size={20} className="mb-1" />
                  <span className="text-[8px]">暂无 / No Logo</span>
                </div>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="relative overflow-hidden block">
              <span className={buttonStyles.secondary}>
                <Upload size={14} /> 上传 Logo / Upload
              </span>
              <input 
                type="file" 
                onChange={(e) => handleLogoUpload(e, categories, tags, manufacturers)} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept="image/*" 
              />
            </label>
            <p className="text-[9px] text-brand-navy/40 font-black uppercase tracking-tighter leading-relaxed px-1">推荐比例 1:1 / Ratio 1:1</p>
          </div>
      </div>
    </div>
  );
};
