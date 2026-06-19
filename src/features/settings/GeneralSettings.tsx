import React from 'react';
import { LogoSection } from './LogoSection';
import { WhatsAppSection } from './WhatsAppSection';
import { AppSettings, Category, Tag, Manufacturer, Photo } from '@/types';
import { AutoForm } from '@/components/form/AutoForm';
import { SettingsSchema } from '@/types/settings';

interface GeneralSettingsProps {
  settings: AppSettings;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  photos: any[];
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

  const handleSubmit = async (data: Record<string, unknown>) => {
    // Sync with existing update flow
    Object.keys(data).forEach(key => {
      setSettingField(key as keyof AppSettings, data[key] as any);
    });
  };

  return (
    <div className="space-y-6">
      <LogoSection 
        settings={settings}
        handleLogoUpload={handleLogoUpload}
        categories={categories}
        tags={tags}
        manufacturers={manufacturers}
        cardClass={cardClass}
        buttonStyles={buttonStyles}
      />
      <div className={cardClass}>
         <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest mb-4">
           設定自動表單 (AutoForm Pilot)
         </h4>
        <AutoForm
          schema={SettingsSchema}
          defaultValues={settings as any}
          onSubmit={handleSubmit}
        />
      </div>
      <WhatsAppSection 
        settings={settings}
        setSettingField={setSettingField}
        cardClass={cardClass}
        inputClass={inputClass}
      />
    </div>
  );
};
