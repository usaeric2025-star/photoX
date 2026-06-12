import React from 'react';
import { Photo, Tag } from '@/types/photo';
import { cn } from '@/lib/utils';
import { MetadataSection } from './info/MetadataSection';
import { DimensionsSection } from './info/DimensionsSection';
import { DescriptionSection } from './info/DescriptionSection';
import { CategoryTagsSection } from './info/CategoryTagsSection';
import { SupportedLanguage } from './info/LanguageTabs';

interface SinglePhotoInfoSectionProps {
  data: Photo;
  appLang: string;
  descLang: SupportedLanguage;
  setDescLang: React.Dispatch<React.SetStateAction<SupportedLanguage>>;
  l: any;
  displayDesc?: string;
  rawDisplayName?: string;
  displayName?: string;
  displayNameMainEn?: string;
  otherNameItems: string[];
  displayManufacturerName: string;
  displayCategoryName: string;
  displayTags: Tag[];
  isAdmin: boolean;
  hasZh: boolean;
  hasEn: boolean;
  hasMs: boolean;
}

export const SinglePhotoInfoSection = ({
  data,
  appLang,
  descLang,
  setDescLang,
  l,
  displayDesc,
  rawDisplayName,
  displayName,
  displayNameMainEn,
  otherNameItems,
  displayManufacturerName,
  displayCategoryName,
  displayTags,
  isAdmin,
  hasZh,
  hasEn,
  hasMs
}: SinglePhotoInfoSectionProps) => {
  return (
    <>
      <section className="relative">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.basicInfo}</h4>
          {/* Status dot */}
          <div 
            title={data.is_hidden ? l.hidden : l.public} 
            className={cn("w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white", data.is_hidden ? "bg-red-500" : "bg-green-500")} 
          />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{displayName || l.unknown}</h2>
        {displayNameMainEn && displayNameMainEn !== displayName && (
          <h3 className="text-sm font-medium text-slate-500 mb-3">{displayNameMainEn}</h3>
        )}
      </section>

      {/* Product Metadata */}
      <MetadataSection 
        photo={data} 
        manufacturerName={displayManufacturerName} 
        texts={l} 
      />

      {/* Furniture Dimensions */}
      <DimensionsSection 
        dimensions={data.dimensions || undefined} 
        appLang={appLang}
        texts={l}
        otherItems={otherNameItems}
      />

      {/* Description (multilingual) */}
      {displayDesc && displayDesc.trim() !== displayName?.trim() && displayDesc.trim() !== rawDisplayName?.trim() && (
        <DescriptionSection 
          photo={data}
          hasZh={hasZh}
          hasEn={hasEn}
          hasMs={hasMs}
          descLang={descLang}
          setDescLang={setDescLang}
          displayDesc={displayDesc}
          texts={l}
        />
      )}

      {/* Classification */}
      <CategoryTagsSection 
        categoryName={displayCategoryName} 
        tags={displayTags} 
        isAdmin={isAdmin} 
        appLang={appLang} 
        texts={l} 
      />
    </>
  );
};
