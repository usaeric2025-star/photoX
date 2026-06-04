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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [descLang, setDescLang] = React.useState<'zh' | 'en' | 'ms'>('zh');

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
  const appLang = useUIStore((s) => s.appLang);

  const isGroup = mode === 'group' && 'member_count' in data;
  
  // Resolve labels dynamically
  let displayCategoryName = '';
  let displayTagNames: string[] = [];
  let displayManufacturerName = '';
  
  if (!isGroup) {
    const photo = data as Photo;
    if (photo.category_id) {
       displayCategoryName = getTranslatedCategoryName(photo.category_id, fetchedCategories, appLang, translations[appLang]);
    }
    if (Array.isArray(photo.tag_ids) && photo.tag_ids.length > 0) {
       displayTagNames = photo.tag_ids.map(id => {
         const t = fetchedTags.find(tag => String(tag.id) === String(id));
         return t ? t.name : '';
       }).filter(Boolean);
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

  const hasZh = !!(data as Photo).description;
  const hasEn = !!(data as Photo).description_translations?.en;
  const hasMs = !!(data as Photo).description_translations?.ms;
  
  const showLanguageToggle = [hasZh, hasEn, hasMs].filter(Boolean).length > 1;

  let displayDesc = '';
  if (descLang === 'ms' && hasMs) displayDesc = (data as Photo).description_translations!.ms!;
  else if (descLang === 'en' && hasEn) displayDesc = (data as Photo).description_translations!.en!;
  else if (descLang === 'zh' && hasZh) displayDesc = (data as Photo).description!;
  
  // if current language is empty, fallback to available
  if (!displayDesc) {
     if (hasEn) displayDesc = (data as Photo).description_translations!.en!;
     else if (hasZh) displayDesc = (data as Photo).description!;
     else if (hasMs) displayDesc = (data as Photo).description_translations!.ms!;
  }

  return (
    <div className={cn("flex flex-col h-full bg-white/95 backdrop-blur-md border-l border-slate-200 overflow-y-auto no-scrollbar", className)}>
      {/* Header with Actions */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 z-10">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          {isGroup ? <Layers size={18} className="text-brand-navy" /> : <Info size={18} className="text-brand-navy" />}
          {isGroup ? l.groupDetails : l.photoDetails}
        </h3>
        <div className="flex items-center gap-1">
          {showAi && !isGroup && (
            <Button variant="ghost" size="icon" onClick={onAiAnalyze} title={l.aiAnalyze} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <Sparkles size={16} />
            </Button>
          )}
          {showEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} title={l.edit} className="h-8 w-8 text-slate-600">
              <Pencil size={16} />
            </Button>
          )}
          {showDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} title={l.delete} className="h-8 w-8 text-red-600 hover:bg-red-50">
              <Trash2 size={16} />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title={l.close} className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-1">
              <X size={18} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-8 pb-[100px] md:pb-6">
        {isGroup ? (
          /* Group Mode View */
          <>
            <section className="relative">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.basicInfo}</h4>
                <span className="text-[8px] font-mono text-slate-300/30 hover:text-slate-400 transition-colors cursor-help" title={`Group ID: ${data.id}`}>{data.id?.split('-')[0]}</span>
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
            <section className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Briefcase size={12} /> {l.metadata}</span>
                <span className="text-[8px] font-mono text-slate-400 cursor-help" title={`ID: ${(data as Photo).id}`}>{(data as Photo).id?.split('-')[0]}</span>
              </div>
              <div className="p-4 space-y-4">
                {/* Codes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{l.itemCode}</span>
                    <span className="text-sm font-mono font-semibold text-slate-900">{(data as Photo).item_code || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{l.modelNumber}</span>
                    <span className="text-sm font-mono font-semibold text-slate-900">{(data as Photo).model_number || '-'}</span>
                  </div>
                  {/* Price */}
                  <div className="col-span-2 flex justify-between bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{l.priceOrCode}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {[(data as Photo).price ? `$${(data as Photo).price}` : '', (data as Photo).manual_code].filter(Boolean).join(' • ') || '-'}
                      </span>
                    </div>
                    {(data as Photo).width ? (
                       <div className="text-right">
                         <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{l.imgSize}</span>
                         <span className="text-[11px] font-mono text-slate-600">{(data as Photo).width} × {(data as Photo).height}</span>
                       </div>
                    ) : null}
                  </div>
                  {/* Manufacturer */}
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">{l.manufacturer}</span>
                    <span className="text-sm font-medium text-slate-900">{displayManufacturerName || '-'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Furniture Dimensions */}
            {Array.isArray((data as Photo).dimensions) && (data as Photo).dimensions!.length > 0 && (
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><Maximize2 size={12} /> {l.dimensions}</h4>
                <div className="space-y-2">
                  {(data as Photo).dimensions!.map((dim, idx) => (
                    <div key={idx} className="flex flex-col text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          {dim.label || l.standard}
                          {dim.is_ai && <Sparkles size={10} className="text-blue-500" title={l.aiEstimated} />}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">{dim.unit}</span>
                      </div>
                      <span className="font-mono text-slate-600">
                        {dim.length}L × {dim.width}W × {dim.height}H
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Description (multilingual) */}
            {(hasZh || hasEn || hasMs) && (
              <section className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    {l.description}
                    {(data as Photo).is_ai_described && <Sparkles size={10} className="text-blue-500" title={l.aiGenerated} />}
                  </h4>
                  {/* Language Toggle */}
                  {showLanguageToggle && (
                    <div className="flex bg-slate-100 rounded border border-slate-200 p-0.5">
                      {hasZh && (
                        <button 
                          onClick={() => setDescLang('zh')} 
                          className={cn("text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1", descLang === 'zh' ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
                        >
                          ZH
                        </button>
                      )}
                      {hasEn && (
                        <button 
                          onClick={() => setDescLang('en')} 
                          className={cn("text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1", descLang === 'en' ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
                        >
                          EN
                        </button>
                      )}
                      {hasMs && (
                        <button 
                          onClick={() => setDescLang('ms')} 
                          className={cn("text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1", descLang === 'ms' ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
                        >
                          MS
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {displayDesc}
                </div>
              </section>
            )}

             {/* Classification */}
            {(displayCategoryName || displayTagNames.length > 0) && (
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                  <Grid size={12} /> {l.classification}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {displayCategoryName && (
                    <Badge variant="outline" className="bg-brand-navy/5 text-brand-navy border-brand-navy/10 px-2.5 py-1 shadow-sm">
                      <Grid size={12} className="mr-1.5 opacity-60" />
                      {displayCategoryName}
                    </Badge>
                  )}
                  {displayTagNames.map((tag: string) => (
                    <span 
                      key={tag}
                      className="text-[10.5px] font-semibold text-brand-navy/70 px-2.5 py-1 bg-brand-navy/5 rounded-full cursor-default border border-brand-navy/10 shadow-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

