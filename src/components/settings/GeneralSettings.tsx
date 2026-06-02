import React from 'react';
import { LogoSection } from './LogoSection';
import { WhatsAppSection } from './WhatsAppSection';
import { AppSettings, Category, Tag, Manufacturer, Photo } from '@/types';

interface GeneralSettingsProps {
  settings: AppSettings;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  photos: Photo[];
  onHealthCheck: (photos: Photo[]) => Promise<void>;
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
  onHealthCheck,
  setSettingField,
  cardClass,
  inputClass,
  buttonStyles
}: GeneralSettingsProps) {
  return (
    <>
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
