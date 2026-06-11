import React, { useRef, useState } from 'react';
import { Photo, ProductGroup } from '../../types';
import { Layers, Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore, useShallow, useColumns } from '@/store/useUIStore';
import { translations } from '../../lib/translations';
import { PhotoCard } from '../photo/PhotoCard';
import { VirtualGrid } from '@/components/virtualizer/VirtualGrid';
import { GROUP_LIST_CONFIG } from '@/config/virtuoso.config';
import { GroupInfoPanel } from './GroupInfoPanel';

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
            {groupData && <GroupInfoPanel groupData={groupData} lang={lang} />}
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
