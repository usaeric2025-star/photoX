import React from 'react';
import { Photo, ProductGroup } from '@/types/photo';
import { Tag } from '@/types/photo';
import { getTranslatedCategoryName } from '@/lib/ui-helpers';
import { translations } from '@/lib/translations';
import { useCategories, useManufacturers } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { Info, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSafeText } from '@/lib/ai/safeText';

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

  const l = {
    groupDetails: appLang === 'zh' ? '合组详情' : appLang === 'ms' ? 'Butiran Kumpulan' : 'Group Details',
    photoDetails: appLang === 'zh' ? '照片资料' : appLang === 'ms' ? 'Butiran Foto' : 'Photo Details',
    basicInfo: appLang === 'zh' ? '基本信息' : appLang === 'ms' ? 'Maklumat Asas' : 'Basic Info',
    hidden: appLang === 'zh' ? '已隐藏' : appLang === 'ms' ? 'Sembunyi' : 'Hidden',
    public: appLang === 'zh' ? '公开展示' : appLang === 'ms' ? 'Umum' : 'Public',
    metadata: appLang === 'zh' ? '元数据' : appLang === 'ms' ? 'Metadata' : 'Metadata',
    members: appLang === 'zh' ? ' 个成员' : appLang === 'ms' ? ' ahli' : ' members',
    unknown: appLang === 'zh' ? '未知' : appLang === 'ms' ? 'Tidak diketahui' : 'Unknown',
  };
  
  const actionTexts = {
    aiAnalyze: appLang === 'zh' ? 'AI 分析' : appLang === 'ms' ? 'Analisis AI' : 'AI Analyze',
    edit: appLang === 'zh' ? '编辑' : appLang === 'ms' ? 'Edit' : 'Edit',
    delete: appLang === 'zh' ? '删除' : appLang === 'ms' ? 'Padam' : 'Delete',
    close: appLang === 'zh' ? '关闭' : appLang === 'ms' ? 'Tutup' : 'Close',
  };

  // Description and Name splitting
  const displayDesc = getSafeText(data.description, descLang);
  const rawDisplayName = getSafeText(data.name, appLang);
  const displayNameEn = getSafeText(data.name, 'en');

  // Name splitting using service utility
  const { main: displayName, others: otherNameItems } = splitProductName(rawDisplayName || '');
  const { main: displayNameMainEn } = splitProductName(displayNameEn || '');

  const hasZh = !!(data as Photo).description?.zh;
  const hasEn = !!(data as Photo).description?.en;
  const hasMs = !!(data as Photo).description?.ms;

  return (
    <div className={cn("flex flex-col h-full bg-white/95 backdrop-blur-md border-l border-slate-200 overflow-y-auto no-scrollbar select-text", className)}>
      {/* Header with Actions */}
      <div className={cn("p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 z-[var(--z-sticky)]", headerClassName)}>
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          {isGroup ? <Layers size={18} className="text-brand-navy" /> : <Info size={18} className="text-brand-navy" />}
          {isGroup ? l.groupDetails : l.photoDetails}
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
      <div className="p-6 flex flex-col gap-8 pb-[100px] md:pb-6">
        {isGroup ? (
          <GroupInfoSection 
            data={data as ProductGroup}
            displayName={displayName}
            l={l}
            isAdmin={isAdmin}
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

