import React from 'react';
import { Photo, ProductGroup } from '@/types/photo';
import { Tag } from '@/types/photo';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { translations, type LanguageCode } from '@/locales';
import { useCategories, useManufacturers } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { Info, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSafeText } from '@/services/ai/safeText';

import { InfoPanelSkeleton } from './InfoPanelSkeleton';
import { splitProductName } from '@/services/ai/utils';
import { SupportedLanguage } from './info/LanguageTabs';
import { DescriptionSection } from './info/DescriptionSection';
import { ActionButtons } from './info/ActionButtons';
import { GroupInfoSection } from './GroupInfoSection';
import { SinglePhotoInfoSection } from './SinglePhotoInfoSection';

interface PhotoInfoPanelProps {
  mode: 'single' | 'group';
  data: Photo | ProductGroup | any;
  showEdit?: boolean;
  showDelete?: boolean;
  showAi?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAiAnalyze?: () => void;
  onClose?: () => void;
  className?: string;
  headerClassName?: string;
}

export function PhotoInfoPanel({
  mode,
  data,
  showEdit,
  showDelete,
  showAi,
  onEdit,
  onDelete,
  onAiAnalyze,
  onClose,
  className,
  headerClassName
}: PhotoInfoPanelProps) {
  const appLang = useUIStore((s) => s.appLang);
  const [descLang, setDescLang] = React.useState<SupportedLanguage>(appLang as any || 'zh');

  React.useEffect(() => {
    if (appLang === 'zh' || appLang === 'en' || appLang === 'ms') {
      setDescLang(appLang as any);
    }
  }, [appLang, data, mode]);

  if (!data) {
    return <InfoPanelSkeleton className={className} />;
  }

  const { data: fetchedCategories = [] } = useCategories();
  const { data: fetchedManufacturers = [] } = useManufacturers();
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  const isGroup = mode === 'group' && 'member_count' in data;
  
  // Resolve labels dynamically
  let displayCategoryName = '';
  let displayTags: Tag[] = [];
  let displayManufacturerName = '';
  
  if (!isGroup) {
    const photo = data as Photo;
    if (photo.category_id) {
       displayCategoryName = getTranslatedCategoryName(photo.category_id, fetchedCategories, appLang, translations[appLang]);
    }
    if (Array.isArray(photo.tags) && photo.tags.length > 0) {
        displayTags = photo.tags;
    }
    if (photo.manufacturer_id) {
       const m = fetchedManufacturers.find(mfr => String(mfr.id) === String(photo.manufacturer_id));
       if (m) displayManufacturerName = getSafeText(m.name, appLang);
    }
  }

  const l = translations[appLang as LanguageCode || 'zh'];
  
  const actionTexts = {
    aiAnalyze: l.aiAnalyze,
    edit: l.edit,
    delete: l.delete,
    close: l.close,
  };

  // Description and Name splitting
  const displayDesc = getSafeText(data.description, descLang);
  const rawDisplayName = getSafeText(data.name, appLang);
  const displayNameEn = getSafeText(data.name, 'en');

  // Name splitting using service utility
  const { main: displayName, others: otherNameItems } = splitProductName(rawDisplayName || '');
  const { main: displayNameMainEn } = splitProductName(displayNameEn || '');

  const hasDescription = !!(data as Photo).description;
  const hasZh = false; // Legacy requirement from object structure
  const hasEn = false;
  const hasMs = false;

  return (
    <div className={cn("flex flex-col h-full bg-white border-l border-slate-200 select-text", className)}>
      {/* Header with Actions */}
      <div className={cn("p-4 border-b border-slate-100 flex items-center justify-between bg-white/90", headerClassName)}>
        <h3 className="font-bold text-slate-900 flex items-center gap-2 truncate max-w-[200px] md:max-w-[280px]">
          {isGroup ? <Layers size={18} className="text-brand-navy shrink-0" /> : <Info size={18} className="text-brand-navy shrink-0" />}
          <span className="truncate">{isGroup ? (rawDisplayName || l.groupDetails) : l.photoDetails}</span>
        </h3>
        <ActionButtons 
          isGroup={isGroup} 
          showAi={isGroup ? false : showAi} 
          showEdit={showEdit} 
          showDelete={showDelete} 
          onAiAnalyze={onAiAnalyze} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          onClose={onClose} 
          texts={actionTexts}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col gap-8 pb-[100px] md:pb-12">
        {isGroup ? (
          <GroupInfoSection 
            data={data as ProductGroup}
            displayName={displayName}
            l={l}
            isAdmin={isAdmin}
            appLang={appLang}
            displayDesc={displayDesc}
            rawDisplayName={rawDisplayName}
          />
        ) : (
          <SinglePhotoInfoSection 
            data={data as Photo}
            appLang={appLang}
            descLang={descLang}
            setDescLang={setDescLang}
            l={l}
            displayDesc={displayDesc}
            rawDisplayName={rawDisplayName}
            displayName={displayName}
            displayNameMainEn={displayNameMainEn}
            otherNameItems={otherNameItems}
            displayManufacturerName={displayManufacturerName}
            displayCategoryName={displayCategoryName}
            displayTags={displayTags}
            isAdmin={isAdmin}
            hasZh={hasZh}
            hasEn={hasEn}
            hasMs={hasMs}
          />
        )}
      </div>
    </div>
  );
}

