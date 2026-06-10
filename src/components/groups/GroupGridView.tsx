import React, { useRef, useState } from 'react';
import { Photo, ProductGroup } from '../../types';
import { Layers, Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore, useShallow, useColumns } from '@/store/useUIStore';
import { translations } from '../../lib/translations';
import { PhotoCard } from '../photo/PhotoCard';
import { VirtualGrid } from '@/components/virtualizer/VirtualGrid';
import { GROUP_LIST_CONFIG } from '@/config/virtuoso.config';

interface GroupGridViewProps {
  photos: Photo[];
  groupData?: ProductGroup | null;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
  isMultiSelectMode?: boolean;
  selectedPhotoIds?: string[];
  getPhotoProps?: (photo: Photo) => any;
  highlightId?: string | null;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
}

function GroupDetailsCard({ groupData }: { groupData: ProductGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const defaultLang = useUIStore.getState().appLang as 'zh' | 'en' | 'ms';
  const [descLang, setDescLang] = useState<'zh' | 'en' | 'ms'>(['zh', 'en', 'ms'].includes(defaultLang) ? defaultLang : 'zh');

  if (!groupData) return null;

  const getDescObj = () => {
    const desc = groupData.description;
    if (!desc) return { zh: '', en: '', ms: '' };
    if (typeof desc === 'string') {
      try {
        return JSON.parse(desc);
      } catch {
        return { zh: desc, en: desc, ms: desc };
      }
    }
    return desc as any;
  };

  const descObj = getDescObj();
  const descriptionText = (descObj[descLang] || '').trim();
  const hasDescription = !!descriptionText || Object.values(descObj).some(v => !!String(v).trim());
  const hasColors = groupData.colors && groupData.colors.length > 0;
  const hasMaterials = groupData.materials && groupData.materials.length > 0;

  if (!hasDescription && !hasColors && !hasMaterials) return null;

  return (
    <div className="px-4 sm:px-6 pt-2 pb-4 w-full max-w-4xl mx-auto">
      <div className={`rounded-3xl border transition-all duration-300 ${
        groupData.is_hidden 
          ? 'bg-slate-50/80 border-slate-200/60' 
          : 'bg-slate-50/30 border-slate-100 shadow-sm hover:shadow-md hover:bg-slate-50/60'
      }`}>
        
        {/* Header - Clickable to toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">
              <Quote size={13} className="opacity-80" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold tracking-wider text-slate-700 uppercase">
              {defaultLang === 'zh' ? '系列故事与详情' : defaultLang === 'ms' ? 'Kisah & Perincian Siri' : 'Series Story & Details'}
            </h3>
          </div>
          <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Expandable Content */}
        {isOpen && (
          <div className="px-5 pb-6 animate-in fade-in slide-in-from-top-3 duration-300 border-t border-slate-100/50 pt-5">
            <div className="flex justify-start gap-1.5 mb-4">
              {(['zh', 'en', 'ms'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setDescLang(l)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    descLang === l 
                      ? 'bg-slate-800 text-white shadow-sm scale-105' 
                      : 'bg-white border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {l === 'zh' ? '中文' : l === 'en' ? 'EN' : 'MS'}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-6 mt-4">
              <div className="flex-1 space-y-4">
                {hasDescription && (
                  <div className="bg-white/80 rounded-2xl p-4.5 border border-slate-100 shadow-sm">
                    <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap font-sans">
                      {descriptionText || '暂无该语言描述 / No description in this language'}
                    </p>
                  </div>
                )}
                
                {hasMaterials && (
                  <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                      {defaultLang === 'zh' ? '材质' : defaultLang === 'ms' ? 'Bahan/Kit' : 'Materials'}
                    </span>
                    {groupData.materials?.map(m => (
                      <div key={m} className="flex items-center px-3 py-0.5 bg-white rounded-full border border-slate-200/60 shadow-sm">
                        <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[120px]">{m}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hasColors && (
                <div className="md:w-48 flex-shrink-0 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {defaultLang === 'zh' ? '配色' : defaultLang === 'ms' ? 'Warna' : 'Colors'}
                  </span>
                  <div className="flex flex-wrap gap-2 bg-white/50 p-2.5 rounded-2xl border border-slate-100/50">
                      {groupData.colors?.map((c, i) => (
                        <div 
                          key={i} 
                          className="w-8 h-8 rounded-xl border border-white shadow-sm ring-1 ring-slate-100 transition-all hover:scale-110 hover:shadow"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupGridFooter({ 
  isFetchingNextPage, hasNextPage, hasPhotos, textLoading, textEndOfList 
}: { 
  isFetchingNextPage: boolean, hasNextPage: boolean, hasPhotos: boolean, textLoading: string, textEndOfList: string 
}) {
  if (isFetchingNextPage) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-16">
        <div className="w-5 h-5 border-[2px] border-slate-300 border-t-slate-800 rounded-full animate-spin" />
        <span className="text-[10px] text-slate-500 font-medium tracking-tight animate-pulse">
          {textLoading}
        </span>
      </div>
    );
  }
  if (!isFetchingNextPage && !hasNextPage && hasPhotos) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-16">
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">
          {textEndOfList}
        </span>
      </div>
    );
  }
  return null;
}

export function GroupGridView({
  photos,
  groupData,
  onPhotoClick,
  onPhotoContextMenu,
  getPhotoProps,
  virtualGridRef,
  highlightId,
  onEndReached,
  isLoading = false,
  isFetchingNextPage,
  hasNextPage,
}: GroupGridViewProps & { virtualGridRef?: React.Ref<any>, isLoading?: boolean }) {
  const lang = useUIStore((s) => s.appLang);
  const t = translations[lang as keyof typeof translations as keyof typeof translations] || translations.en;
  const isMobile = window.innerWidth < 640;
  const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
  const denseColumns = isMobile ? 3 : (isTablet ? 4 : 5);

  const renderItem = (index: number) => {
    const photo = photos[index];
    if (isLoading || !photo) {
      return (
        <div className="p-1 h-full w-full">
          <div className="bg-white rounded-[1.25rem] border border-slate-100 p-1.5 flex flex-col h-full animate-pulse shadow-sm">
            <div className="aspect-square rounded-xl bg-slate-100/80 relative overflow-hidden bg-slate-100" />
            <div className="mt-2.5 px-1 pb-1 space-y-1.5">
              <div className="h-3 w-2/3 bg-slate-100 rounded-lg" />
              <div className="h-2 w-1/2 bg-slate-50 rounded-lg" />
            </div>
          </div>
        </div>
      );
    }
    const isHighlighted = highlightId === photo.id;
    const extraProps = getPhotoProps ? getPhotoProps(photo) : {};
    
    return (
      <div className="p-1 w-full">
        <PhotoCard
          photo={photo}
          index={index}
          hideDetails={false}
          imgVariant="md"
          hideGroupBadge={true}
          onClick={() => onPhotoClick(photo)}
          canPin={false}
          {...extraProps}
        />
      </div>
    );
  };

  return (
    <div className={`w-full h-full relative ${groupData?.is_hidden ? 'grayscale opacity-70' : ''}`}>
      <VirtualGrid
        ref={virtualGridRef}
        count={isLoading ? 12 : (groupData?.member_count && groupData.member_count > photos.length ? groupData.member_count : photos.length)}
        lanes={denseColumns}
        onEndReached={onEndReached}
        header={null}
        footer={
          <div className="flex flex-col">
            {groupData && <GroupDetailsCard groupData={groupData} />}
            <GroupGridFooter 
              isFetchingNextPage={!!isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              hasPhotos={photos.length > 0}
              textLoading={t.loading || '正在载入更多...'}
              textEndOfList={t.endOfList || '已经到底啦'}
            />
          </div>
        }
        renderItem={renderItem}
      />
    </div>
  );
};
