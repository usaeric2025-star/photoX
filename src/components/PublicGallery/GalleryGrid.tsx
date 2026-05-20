import React, { useCallback } from 'react';
import { VirtuosoGrid, VirtuosoGridHandle, VirtuosoGridProps as BaseVirtuosoGridProps } from 'react-virtuoso';
import { Photo, Category, Manufacturer } from '../../types';
import { PhotoCard } from '../PhotoCard';
import { TranslationType } from '../../lib/ui-helpers';
import { useAdminMode } from '../../hooks/useAdminMode';

interface GalleryGridProps {
  virtuosoRef: React.RefObject<VirtuosoGridHandle | null>;
  gridPhotos: Photo[];
  displayPhotos: Photo[];
  columns: 2 | 3 | 5;
  virtuosoComponents?: BaseVirtuosoGridProps<Photo, any>['components'];
  virtuosoContext?: any;
  handleLoadMore: () => void;
  activeIsMultiSelect: boolean;
  isStaffMode: boolean;
  activeSelectedIds: string[];
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  activeToggleSelection: (id: string) => void;
  onEditPhoto?: (id: string) => void;
  setActiveGroupId: (id: string) => void;
  setActivePhotoId: (id: string) => void;
  setLightboxIndex: (index: number) => void;
  startLongPress: (id: string) => void;
  endLongPress: () => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  selectedCatCode: string | null;
  selectedSubId: string | null;
  selectedTagIds: string[];
  searchQuery: string;
  onToggleHidden?: (photo: Photo) => void;
}

interface MemoizedPhotoCardProps {
  index: number;
  photo: Photo;
  isMultiSelect: boolean;
  isStaffMode: boolean;
  isSelected: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onToggleSelection: (id: string) => void;
  onEditPhoto?: (id: string) => void;
  onGroupClick: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (index: number) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  shareSinglePhoto: (photo: Photo) => void;
  displayPhotos: Photo[];
  gridPhotos: Photo[];
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
}

const MemoizedPhotoCard = React.memo(({ 
  index, photo, isMultiSelect, isStaffMode, isSelected, showGroupsCollapsed, 
  lang, t, categories, manufacturers, tagMap, onToggleSelection, onEditPhoto, onGroupClick, 
  onLightboxOpen, onLongPressStart, onLongPressEnd, shareSinglePhoto, displayPhotos, 
  gridPhotos, onTogglePinned, onToggleHidden 
}: MemoizedPhotoCardProps) => {
  const isAdminMode = useAdminMode();
  
  const handleOpenLightbox = useCallback(() => {
    const target = gridPhotos[index];
    if (!target) return;
    const realIndex = displayPhotos.findIndex((p) => p?.id === target.id);
    if (realIndex !== -1) onLightboxOpen(realIndex);
  }, [index, displayPhotos, gridPhotos, onLightboxOpen]);

  const handleGroupClickInternal = useCallback((gid: string) => {
    onGroupClick(gid, photo.id);
  }, [onGroupClick, photo.id]);

  return (
    <PhotoCard 
      photo={photo}
      index={index}
      isMultiSelect={isMultiSelect}
      isStaffMode={isStaffMode}
      isSelected={isSelected}
      showGroupsCollapsed={showGroupsCollapsed}
      lang={lang}
      t={t}
      categories={categories}
      manufacturers={manufacturers}
      tagMap={tagMap}
      onToggleSelection={onToggleSelection}
      onEditPhoto={onEditPhoto}
      onGroupClick={handleGroupClickInternal}
      onLightboxOpen={handleOpenLightbox}
      onLongPressStart={onLongPressStart}
      onLongPressEnd={onLongPressEnd}
      shareSinglePhoto={shareSinglePhoto}
      onTogglePinned={onTogglePinned}
      onToggleHidden={onToggleHidden}
    />
  );
});
MemoizedPhotoCard.displayName = 'MemoizedPhotoCard';

export const GalleryGrid: React.FC<GalleryGridProps> = (props) => {
  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
     props.setActiveGroupId(gid);
     if (photoId) {
       props.setActivePhotoId(photoId);
     }
  }, [props.setActiveGroupId, props.setActivePhotoId]);

  const handleLoadMore = useCallback(() => {
    props.handleLoadMore();
  }, [props.handleLoadMore]);

  return (
    <VirtuosoGrid
      ref={props.virtuosoRef}
      style={{ height: '100%', width: '100%' }}
      data={props.gridPhotos}
      computeItemKey={(index, item) => {
        const p = item as Photo;
        return p ? (p.type === 'group' ? `group-${p.groupId}` : `photo-${p.id}`) : `loading-${index}`;
      }}
      components={props.virtuosoComponents}
      context={props.virtuosoContext}
      endReached={handleLoadMore}
      overscan={800}
      increaseViewportBy={300}
      listClassName={`grid gap-3 p-2 ${props.columns === 2 ? 'grid-cols-2' : props.columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
      itemContent={(index, photo) => {
        return (
          <MemoizedPhotoCard
            index={index}
            photo={photo}
            isMultiSelect={props.activeIsMultiSelect}
            isStaffMode={props.isStaffMode}
            isSelected={photo ? !!props.activeSelectedIds.includes(photo.id) : false}
            showGroupsCollapsed={props.showGroupsCollapsed}
            lang={props.lang}
            t={props.t}
            categories={props.categories}
            manufacturers={props.manufacturers}
            tagMap={props.tagMap}
            onToggleSelection={props.activeToggleSelection}
            onEditPhoto={props.onEditPhoto}
            onGroupClick={handleGroupClick}
            onLightboxOpen={props.setLightboxIndex}
            onLongPressStart={props.startLongPress}
            onLongPressEnd={props.endLongPress}
            shareSinglePhoto={props.shareSinglePhoto}
            onTogglePinned={props.onTogglePinned}
            onToggleHidden={props.onToggleHidden}
            displayPhotos={props.displayPhotos}
            gridPhotos={props.gridPhotos}
          />
        );
      }}
    />
  );
};
