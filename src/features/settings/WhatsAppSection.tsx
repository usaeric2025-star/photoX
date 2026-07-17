import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { AppSettings } from '#src/types/index.js';

interface WhatsAppSectionProps {
  settings: AppSettings;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

/**
 * WhatsAppSection
 * 
 * 處理 WhatsApp 聯繫人的編輯。支持舊版底線命名兼容。
 */
export function WhatsAppSection({
  settings,
  setSettingField,
  cardClass,
  inputClass
}: WhatsAppSectionProps) {
  return (
    <div className={cardClass} id="section-whatsapp">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-3 bg-[#25D366] rounded-full shrink-0"></div>
        <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
          聯繫人設定 / WhatsApp Contacts
        </h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => {
          const nameKey = `whatsapp${i}Name` as keyof AppSettings;
          const phoneKey = `whatsapp${i}` as keyof AppSettings;
          
          return (
            <div key={i} className="p-4 bg-slate-50/50 rounded-2xl border border-brand-navy/5 space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="user" size={12} className="text-brand-navy/30" />
                <span className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">聯繫人 {i === 1 ? 'A' : 'B'}</span>
              </div>
              
              <div className="space-y-2">
                <input 
                  id={`whatsapp-${i}-name`}
                  type="text" 
                  placeholder="名稱 / Name" 
                  className={`${inputClass} w-full bg-white shadow-sm border-none`} 
                  value={String(settings[nameKey] || '')} 
                  onChange={(e) => setSettingField(nameKey, e.target.value)} 
                />
                
                <input 
                  id={`whatsapp-${i}-phone`}
                  type="text" 
                  placeholder="號碼 / Phone (e.g. +86138...)" 
                  className={`${inputClass} w-full bg-white shadow-sm border-none font-mono text-[11px]`} 
                  value={String(settings[phoneKey] || '')} 
                  onChange={(e) => setSettingField(phoneKey, e.target.value)} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
