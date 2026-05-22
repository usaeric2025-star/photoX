import React, { useCallback } from 'react';
import { VirtuosoGrid, VirtuosoGridHandle, VirtuosoGridProps as BaseVirtuosoGridProps } from 'react-virtuoso';
import { VIRTUOSO_CONFIG } from '../../config/virtuoso.config';
import { Photo, Category, Manufacturer } from '../../types';
import { PublicPhotoCard } from '../public/PublicPhotoCard';
import { AdminPhotoCard } from '../admin/AdminPhotoCard';
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
  isAdminMode: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onEditPhoto?: (id: string) => void;
  setActiveGroupId: (id: string) => void;
  setActivePhotoId: (id: string) => void;
  setLightboxIndex: (index: number) => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  selectedCatCode: string | null;
  filterSubId: string | null;
  selectedTagIds: string[];
  searchQuery: string;
  onToggleHidden?: (photo: Photo) => void;
}

interface MemoizedPhotoCardProps {
  index: number;
  photo: Photo;
  isAdminMode: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onEditPhoto?: (id: string) => void;
  onGroupClick: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
}

const MemoizedPhotoCard = React.memo(({ 
  index, photo, isAdminMode, showGroupsCollapsed, 
  lang, t, categories, manufacturers, tagMap, onEditPhoto, onGroupClick, 
  onLightboxOpen, shareSinglePhoto, 
  onTogglePinned, onToggleHidden
}: MemoizedPhotoCardProps) => {
  const handleGroupClickInternal = useCallback((gid: string) => {
    onGroupClick(gid, photo.id);
  }, [onGroupClick, photo.id]);

  if (isAdminMode) {
    return (
      <AdminPhotoCard 
        photo={photo}
        index={index}
        showGroupsCollapsed={showGroupsCollapsed}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        onEditPhoto={onEditPhoto}
        onGroupClick={handleGroupClickInternal}
        onLightboxOpen={onLightboxOpen}
        shareSinglePhoto={shareSinglePhoto}
        onTogglePinned={onTogglePinned}
        onToggleHidden={onToggleHidden}
      />
    );
  }

  return (
    <PublicPhotoCard 
      photo={photo}
      index={index}
      showGroupsCollapsed={showGroupsCollapsed}
      lang={lang}
      t={t}
      categories={categories}
      manufacturers={manufacturers}
      tagMap={tagMap}
      onGroupClick={handleGroupClickInternal}
      onLightboxOpen={onLightboxOpen}
      shareSinglePhoto={shareSinglePhoto}
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

  const handleEditPhoto = useCallback((id: string) => {
    props.onEditPhoto?.(id);
  }, [props.onEditPhoto]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    const realIndex = props.displayPhotos.findIndex(p => p?.id === photo.id);
    if (realIndex !== -1) {
      props.setLightboxIndex(realIndex);
    }
  }, [props.displayPhotos, props.setLightboxIndex]);

  const handleShareSinglePhoto = useCallback((photo: Photo) => {
    props.shareSinglePhoto(photo);
  }, [props.shareSinglePhoto]);

  const handleTogglePinned = useCallback((photo: Photo) => {
    props.onTogglePinned?.(photo);
  }, [props.onTogglePinned]);

  const handleToggleHidden = useCallback((photo: Photo) => {
    props.onToggleHidden?.(photo);
  }, [props.onToggleHidden]);

  return (
    <VirtuosoGrid
      ref={props.virtuosoRef}
      style={{ height: '100%', width: '100%' }}
      data={props.gridPhotos}
      computeItemKey={(index, item) => {
        const p = item as Photo;
        return p ? (p.type === 'group' ? `group-${p.group_id}` : `photo-${p.id}`) : `loading-${index}`;
      }}
      components={props.virtuosoComponents}
      context={props.virtuosoContext}
      endReached={handleLoadMore}
      overscan={VIRTUOSO_CONFIG.overscan(props.columns)}
      increaseViewportBy={VIRTUOSO_CONFIG.increaseViewportBy}
      useWindowScroll={false}
      itemClassName="virtuoso-grid-item"
      listClassName={`grid gap-2 px-1.5 py-2 ${props.columns === 2 ? 'grid-cols-2' : props.columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
      itemContent={(index, photo) => {
        return (
          <MemoizedPhotoCard
            index={index}
            photo={photo}
            isAdminMode={props.isAdminMode}
            showGroupsCollapsed={props.showGroupsCollapsed}
            lang={props.lang}
            t={props.t}
            categories={props.categories}
            manufacturers={props.manufacturers}
            tagMap={props.tagMap}
            onEditPhoto={handleEditPhoto}
            onGroupClick={handleGroupClick}
            onLightboxOpen={handleLightboxOpen}
            shareSinglePhoto={handleShareSinglePhoto}
            onTogglePinned={handleTogglePinned}
            onToggleHidden={handleToggleHidden}
          />
        );
      }}
    />
  );
};
