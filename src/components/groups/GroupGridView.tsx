import React, { useRef, useMemo, useCallback } from 'react';
import { Photo, ProductGroup } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { Star, Sparkles, Check, Info, Palette, Layers, Quote } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { VirtuosoGrid } from 'react-virtuoso';
import { GROUP_LIST_CONFIG } from '@/config/virtuoso.config';
import { useGalleryStore, useShallow } from '../../store';
import { translations } from '../../lib/translations';
import { PhotoCard } from '../photo/PhotoCard';

interface GroupGridViewProps {
  photos: Photo[];
  groupData?: ProductGroup | null;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
  isMultiSelectMode?: boolean;
  selectedPhotoIds?: string[];
  getPhotoProps?: (photo: Photo) => React.HTMLAttributes<HTMLDivElement>;
  highlightId?: string | null;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  variant?: GalleryVariant;
}

interface GroupGridContext {
  header: React.ReactNode;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  hasPhotos: boolean;
  textLoading: string;
  textEndOfList: string;
}

const GroupGridHeader = React.memo(({ context }: { context?: GroupGridContext }) => {
  return context?.header ? <div className="p-3 sm:p-6 pb-0">{context.header}</div> : null;
});
GroupGridHeader.displayName = 'GroupGridHeader';

const GroupGridFooter = React.memo(({ context }: { context?: GroupGridContext }) => {
  if (!context) return null;
  const { isFetchingNextPage, hasNextPage, hasPhotos, textLoading, textEndOfList } = context;
  if (isFetchingNextPage) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
        <div className="w-5 h-5 border-[2px] border-slate-300 border-t-slate-800 rounded-full animate-spin" />
        <span className="text-[10px] text-slate-500 font-medium tracking-tight animate-pulse">
          {textLoading}
        </span>
      </div>
    );
  }
  if (!isFetchingNextPage && hasNextPage === false && hasPhotos) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">
          {textEndOfList}
        </span>
      </div>
    );
  }
  return <div className="h-40" />;
});
GroupGridFooter.displayName = 'GroupGridFooter';

const GROUP_VIRTUOSO_COMPONENTS = {
  Header: GroupGridHeader,
  Footer: GroupGridFooter
};

export const GroupGridView: React.FC<GroupGridViewProps & { virtuosoRef?: React.Ref<any>, isLoading?: boolean }> = ({
  photos,
  groupData,
  onPhotoClick,
  onPhotoContextMenu,
  getPhotoProps,
  virtuosoRef,
  highlightId,
  onEndReached,
  isLoading = false,
  isFetchingNextPage,
  hasNextPage,
  variant = 'public-showcase'
}) => {
  const lang = useGalleryStore(s => s.appLang);
  const t = useMemo(() => translations[lang as keyof typeof translations] || translations.zh, [lang]);

  const header = useMemo(() => {
    if (!groupData || (!groupData.description && (!groupData.colors || groupData.colors.length === 0) && (!groupData.materials || groupData.materials.length === 0))) {
      return null;
    }
    return (
      <div className={`mb-8 p-6 rounded-[2rem] border-2 shadow-sm relative overflow-hidden group ${groupData.is_hidden ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-50'}`}>
        <div className={`absolute top-0 right-0 p-8 opacity-5 ${groupData.is_hidden ? 'text-slate-400' : 'text-indigo-600'}`}>
          <Quote size={80} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
             <div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${groupData.is_hidden ? 'text-slate-400' : 'text-indigo-400'}`}>系列故事 / Series Story</h3>
                <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-2xl">
                  {groupData.description || '暂无系列说明 / No description yet.'}
                </p>
             </div>
             
             <div className="flex flex-wrap gap-4 pt-2">
               {groupData.materials && groupData.materials.length > 0 && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Layers size={14} className={groupData.is_hidden ? 'text-slate-400' : 'text-indigo-400'} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {groupData.materials.join(' • ')}
                    </span>
                 </div>
               )}
             </div>
          </div>

          {groupData.colors && groupData.colors.length > 0 && (
            <div className="md:w-48 space-y-3">
               <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${groupData.is_hidden ? 'text-slate-400' : 'text-indigo-400'}`}>系列配比 / DNA Colors</h3>
               <div className="flex flex-wrap gap-2">
                  {groupData.colors.map((c, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-transform hover:scale-125"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [groupData]);

  const virtuosoContext = React.useMemo(() => ({
    header,
    isFetchingNextPage: !!isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    hasPhotos: photos.length > 0,
    textLoading: t.loading || '正在载入更多...',
    textEndOfList: t.endOfList || '已经到底啦'
  }), [header, isFetchingNextPage, hasNextPage, photos.length, t]);

  return (
    <div className={`flex-1 min-h-0 relative ${groupData?.is_hidden ? 'grayscale opacity-70' : ''}`}>
      <VirtuosoGrid
        ref={virtuosoRef}
        style={{ height: '100%', width: '100%' }}
        data={photos}
        computeItemKey={(index, item) => {
          const p = item as any;
          return p ? `photo-${p.id}` : `loading-${index}`;
        }}
        totalCount={isLoading ? 12 : photos.length}
        overscan={GROUP_LIST_CONFIG.overscan(4)}
        increaseViewportBy={GROUP_LIST_CONFIG.increaseViewportBy}
        useWindowScroll={false}
        endReached={onEndReached}
        context={virtuosoContext}
        components={GROUP_VIRTUOSO_COMPONENTS}
        listClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-6 p-3 sm:p-6"
        itemContent={useCallback((index: number, item: any) => {
          if (isLoading || !item) {
            return (
              <div 
                className="bg-white rounded-[1.25rem] border border-slate-100 p-1.5 flex flex-col h-full animate-pulse shadow-sm"
              >
                <div className="aspect-square rounded-xl bg-slate-100/80 relative overflow-hidden" />
                <div className="mt-2.5 px-1 pb-1 space-y-1.5">
                  <div className="h-3 w-2/3 bg-slate-100 rounded-lg" />
                  <div className="h-2 w-1/2 bg-slate-50 rounded-lg" />
                </div>
              </div>
            );
          }
          const photo = item as any;
          const isHighlighted = highlightId === photo.id;
          const extraProps = getPhotoProps ? getPhotoProps(photo) : {};
          
          return (
            <PhotoCard
              variant={variant}
              photo={photo}
              index={index}
              showGroupsCollapsed={false}
              onLightboxOpen={onPhotoClick}
              hideDetails={true}
              {...extraProps}
            />
          );
        }, [isLoading, highlightId, getPhotoProps, variant, onPhotoClick])}
      />
    </div>
  );
};
