import React from 'react';
import { Photo, ProductGroup } from '@/types/photo';
import { Category, Tag } from '@/types/photo';
import { getTranslatedCategoryName } from '@/lib/ui-helpers';
import { translations } from '@/lib/translations';
import { useCategories } from '@/hooks/core/queries/useCategories';
import { useTags } from '@/hooks/core/queries/useTags';
import { useManufacturers } from '@/hooks/core/queries/useManufacturers';
import { useUIStore } from '@/store/useUIStore';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  Tag as TagIcon, 
  Grid, 
  Maximize2, 
  Briefcase,
  Layers,
  Sparkles,
  Pencil,
  Trash2,
  X,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import { createPortal } from "react-dom";
import { toast } from '@/lib/ui/toast';

import { DimensionsSection } from './info/DimensionsSection';
import { MetadataSection } from './info/MetadataSection';
import { CategoryTagsSection } from './info/CategoryTagsSection';
import { CopyableId } from '@/components/ui/CopyableId';

import { DescriptionSection } from './info/DescriptionSection';
import { ActionButtons } from './info/ActionButtons';
import { SupportedLanguage } from './info/LanguageTabs';

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
  className
}: PhotoInfoPanelProps) {
  const appLang = useUIStore((s) => s.appLang);
  const [descLang, setDescLang] = React.useState<SupportedLanguage>(appLang as any || 'zh');

  React.useEffect(() => {
    if (appLang === 'zh' || appLang === 'en' || appLang === 'ms') {
      setDescLang(appLang as any);
    }
  }, [appLang]);

  if (!data) {
    return (
      <div className={cn("flex flex-col h-full bg-white/95 backdrop-blur-md border-l border-slate-200 overflow-y-auto no-scrollbar", className)}>
        {/* Header Skeleton */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 z-10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-100 rounded-md animate-pulse" />
            <div className="w-16 h-4 bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className="flex gap-1">
            <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="p-6 flex flex-col gap-8 pb-32">
          <section className="space-y-3">
            <div className="h-2 w-20 bg-slate-50 rounded-full animate-pulse" />
            <div className="h-8 w-full bg-slate-100 rounded-xl animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-slate-50 rounded-lg animate-pulse" />
              <div className="h-6 w-16 bg-slate-50 rounded-lg animate-pulse" />
            </div>
          </section>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-slate-50/50 rounded-xl border border-slate-100 animate-pulse" />
            <div className="h-16 bg-slate-50/50 rounded-xl border border-slate-100 animate-pulse" />
          </div>

          <div className="space-y-4">
             <div className="h-2 w-12 bg-slate-50 rounded-full animate-pulse" />
             <div className="h-24 w-full bg-slate-50/50 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const { data: fetchedCategories = [] } = useCategories();
  const { data: fetchedTags = [] } = useTags();
  const { data: fetchedManufacturers = [] } = useManufacturers();
  const update = useUIStore((s) => s.update);
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
    if (Array.isArray(photo.tag_ids) && photo.tag_ids.length > 0) {
       displayTags = photo.tag_ids.map(id => {
         return fetchedTags.find(tag => String(tag.id) === String(id));
       }).filter(Boolean) as Tag[];
    }
    if (photo.manufacturer_id) {
       const m = fetchedManufacturers.find(mfr => String(mfr.id) === String(photo.manufacturer_id));
       if (m) displayManufacturerName = m.name;
    }
  }

  const l = {
    groupDetails: appLang === 'zh' ? '合组详情' : appLang === 'ms' ? 'Butiran Kumpulan' : 'Group Details',
    photoDetails: appLang === 'zh' ? '照片资料' : appLang === 'ms' ? 'Butiran Foto' : 'Photo Details',
    basicInfo: appLang === 'zh' ? '基本信息' : appLang === 'ms' ? 'Maklumat Asas' : 'Basic Info',
    hidden: appLang === 'zh' ? '已隐藏' : appLang === 'ms' ? 'Sembunyi' : 'Hidden',
    public: appLang === 'zh' ? '公开展示' : appLang === 'ms' ? 'Umum' : 'Public',
    metadata: appLang === 'zh' ? '元数据' : appLang === 'ms' ? 'Metadata' : 'Metadata',
    systemId: appLang === 'zh' ? '系统ID' : appLang === 'ms' ? 'ID Sistem' : 'System ID',
    itemCode: appLang === 'zh' ? '货品编号' : appLang === 'ms' ? 'Kod Item' : 'Item Code',
    modelNumber: appLang === 'zh' ? '型号' : appLang === 'ms' ? 'Nombor Model' : 'Model Number',
    priceOrCode: appLang === 'zh' ? '价格 / 手动编号' : appLang === 'ms' ? 'Harga / Kod Manual' : 'Price / Manual Code',
    imgSize: appLang === 'zh' ? '图片尺寸' : appLang === 'ms' ? 'Saiz Imej' : 'Img Size',
    manufacturer: appLang === 'zh' ? '制造商' : appLang === 'ms' ? 'Pengeluar' : 'Manufacturer',
    dimensions: appLang === 'zh' ? '尺寸' : appLang === 'ms' ? 'Dimensi' : 'Dimensions',
    standard: appLang === 'zh' ? '标准' : appLang === 'ms' ? 'Standard' : 'Standard',
    classification: appLang === 'zh' ? '分类信息' : appLang === 'ms' ? 'Klasifikasi' : 'Classification',
    description: appLang === 'zh' ? '描述' : appLang === 'ms' ? 'Penerangan' : 'Description',
    aiEstimated: appLang === 'zh' ? 'AI 预估' : appLang === 'ms' ? 'Anggaran AI' : 'AI Estimated',
    aiGenerated: appLang === 'zh' ? 'AI 生成' : appLang === 'ms' ? 'Janaan AI' : 'AI Generated',
    unknown: appLang === 'zh' ? '未知' : appLang === 'ms' ? 'Tidak diketahui' : 'Unknown',
    members: appLang === 'zh' ? ' 个成员' : appLang === 'ms' ? ' ahli' : ' members',
    close: appLang === 'zh' ? '关闭' : appLang === 'ms' ? 'Tutup' : 'Close',
    edit: appLang === 'zh' ? '编辑' : appLang === 'ms' ? 'Edit' : 'Edit',
    delete: appLang === 'zh' ? '删除' : appLang === 'ms' ? 'Padam' : 'Delete',
    aiAnalyze: appLang === 'zh' ? 'AI 分析' : appLang === 'ms' ? 'Analisis AI' : 'AI Analyze',
  };

  const hasZh = !!(data as Photo).description_translations?.zh || !!(data as Photo).description;
  const hasEn = !!(data as Photo).description_translations?.en;
  const hasMs = !!(data as Photo).description_translations?.ms;
  
  const showLanguageToggle = [hasZh, hasEn, hasMs].filter(Boolean).length > 1;

  let displayDesc = '';
  if (descLang === 'ms' && hasMs) {
    displayDesc = (data as Photo).description_translations!.ms!;
  } else if (descLang === 'en' && hasEn) {
    displayDesc = (data as Photo).description_translations!.en!;
  } else if (descLang === 'zh' && hasZh) {
    displayDesc = (data as Photo).description_translations?.zh || (data as Photo).description || '';
  }
  
  // fallback mechanism: if preferred language is empty, try others in order
  if (!displayDesc) {
    if (hasZh) displayDesc = (data as Photo).description_translations?.zh || (data as Photo).description || '';
    else if (hasEn) displayDesc = (data as Photo).description_translations!.en!;
    else if (hasMs) displayDesc = (data as Photo).description_translations!.ms!;
  }

  return (
    <div className={cn("flex flex-col h-full bg-white/95 backdrop-blur-md border-l border-slate-200 overflow-y-auto no-scrollbar select-text", className)}>
      {/* Header with Actions */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 z-10">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          {isGroup ? <Layers size={18} className="text-brand-navy" /> : <Info size={18} className="text-brand-navy" />}
          {isGroup ? l.groupDetails : l.photoDetails}
        </h3>
        <ActionButtons 
          isGroup={isGroup} 
          showAi={showAi} 
          showEdit={showEdit} 
          showDelete={showDelete} 
          onAiAnalyze={onAiAnalyze} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          onClose={onClose} 
          texts={l} 
        />
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-8 pb-[100px] md:pb-6">
        {isGroup ? (
          /* Group Mode View */
          <>
            <section className="relative">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.basicInfo}</h4>
                <CopyableId className="bg-transparent border-none text-slate-400 p-0" id={data.id} label="GROUP ID" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{data.name}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 px-2.5 py-1">
                  <Grid size={12} className="mr-1.5 opacity-60" />
                  {data.member_count}{l.members}
                </Badge>
              </div>
              {data.description && (
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                  "{data.description}"
                </p>
              )}
            </section>
          </>
        ) : (
          /* Single Photo Mode View */
          <>
            <section className="relative">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.basicInfo}</h4>
                {/* Status dot */}
                <div 
                  title={(data as Photo).is_hidden ? l.hidden : l.public} 
                  className={cn("w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white", (data as Photo).is_hidden ? "bg-red-500" : "bg-green-500")} 
                />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{(data as Photo).name || l.unknown}</h2>
              {(data as Photo).name_en && (
                <h3 className="text-sm font-medium text-slate-500 mb-3">{(data as Photo).name_en}</h3>
              )}
            </section>

            {/* Product Metadata */}
            <MetadataSection 
              photo={data as Photo} 
              manufacturerName={displayManufacturerName} 
              texts={l as any} 
            />

            {/* Furniture Dimensions */}
            <DimensionsSection 
              dimensions={(data as Photo).dimensions || undefined} 
              texts={l as any} 
            />

            {/* Description (multilingual) */}
            <DescriptionSection 
              photo={data as Photo}
              hasZh={hasZh}
              hasEn={hasEn}
              hasMs={hasMs}
              descLang={descLang}
              setDescLang={setDescLang}
              displayDesc={displayDesc}
              texts={l as any}
            />

             {/* Classification */}
            <CategoryTagsSection 
              categoryName={displayCategoryName} 
              tags={displayTags} 
              isAdmin={isAdmin} 
              appLang={appLang} 
              texts={l as any} 
            />
          </>
        )}
      </div>
    </div>
  );
}

