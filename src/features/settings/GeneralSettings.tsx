import React from 'react';
import { AppNameSection } from './AppNameSection';
import { LogoSection } from './LogoSection';
import { WhatsAppSection } from './WhatsAppSection';
import { SocialLinksSection } from './SocialLinksSection';
import { AppSettings, Category, Tag, Manufacturer, Photo } from '#src/types';

interface GeneralSettingsProps {
  settings: AppSettings;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
  buttonStyles: { [key in 'primary' | 'secondary' | 'accent']: string };
}

export function GeneralSettings({
  settings, 
  handleLogoUpload, 
  categories, 
  tags, 
  manufacturers,
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
        settings={settings}
        handleLogoUpload={handleLogoUpload}
        categories={categories}
        tags={tags}
        manufacturers={manufacturers}
        cardClass={cardClass}
        buttonStyles={buttonStyles}
        setSettingField={setSettingField}
        inputClass={inputClass}
      />
      <WhatsAppSection 
        settings={settings}
        setSettingField={setSettingField}
        cardClass={cardClass}
        inputClass={inputClass}
      />
      <SocialLinksSection 
        settings={settings}
        setSettingField={setSettingField}
        cardClass={cardClass}
        inputClass={inputClass}
      />
    </div>
  );
};
