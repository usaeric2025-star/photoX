import React from 'react';
import { AppNameSection } from './AppNameSection.js';
import { LogoSection } from './LogoSection.js';
import { WhatsAppSection } from './WhatsAppSection.js';
import { AppSettings } from '#src/types/index.js';

interface GeneralSettingsProps {
  settings: AppSettings;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
  buttonStyles: { [key in 'primary' | 'secondary' | 'accent']: string };
}

/**
 * GeneralSettings
 * 
 * 整合基本設置（應用名稱、Logo、WhatsApp 聯繫方式）。
 */
export function GeneralSettings({
  settings, 
  handleLogoUpload, 
  setSettingField,
  cardClass,
  inputClass,
  buttonStyles
}: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <AppNameSection 
        settings={settings}
        setSettingField={setSettingField}
        cardClass={cardClass}
        inputClass={inputClass}
      />
      
      <LogoSection 
        logoUrl={settings.logoUrl}
        handleLogoUpload={handleLogoUpload}
        buttonStyles={buttonStyles}
        cardClass={cardClass}
      />
      
      <WhatsAppSection 
        settings={settings}
        setSettingField={setSettingField}
        cardClass={cardClass}
        inputClass={inputClass}
      />
    </div>
  );
}
