import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { AppSettings } from '../../types';

interface WhatsAppSectionProps {
  settings: AppSettings | null;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

export const WhatsAppSection: React.FC<WhatsAppSectionProps> = ({
  settings,
  setSettingField,
  cardClass,
  inputClass
}) => {
  return (
    <div className={cardClass} id="section-whatsapp">
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-[#25D366] rounded-full"></div>
          WhatsApp 联系人设定 / WhatsApp Contacts
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 pl-1 mb-2">
                <UserIcon size={12} className="text-slate-400" />
                <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest leading-none pt-0.5">联系人 A / Contact A</label>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="名称 / Name" 
                className={inputClass} 
                value={settings?.whatsapp_1_name || ''} 
                onChange={(e) => setSettingField('whatsapp_1_name', e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="号码 / Phone" 
                className={`${inputClass} flex-[1.5]`} 
                value={settings?.whatsapp_1 || ''} 
                onChange={(e) => setSettingField('whatsapp_1', e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 pl-1 mb-2">
                <UserIcon size={12} className="text-slate-400" />
                <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest leading-none pt-0.5">联系人 B / Contact B</label>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="名称 / Name" 
                className={inputClass} 
                value={settings?.whatsapp_2_name || ''} 
                onChange={(e) => setSettingField('whatsapp_2_name', e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="号码 / Phone" 
                className={`${inputClass} flex-[1.5]`} 
                value={settings?.whatsapp_2 || ''} 
                onChange={(e) => setSettingField('whatsapp_2', e.target.value)} 
              />
            </div>
          </div>
        </div>
    </div>
  );
};
