import React, { useCallback, useMemo } from 'react';
import { VirtuosoGrid, VirtuosoGridHandle, VirtuosoGridProps as BaseVirtuosoGridProps } from 'react-virtuoso';
import { VIRTUOSO_CONFIG } from '../../config/virtuoso.config';
import { Photo, Category, Manufacturer } from '../../types';
import { PhotoCard } from '../photo/PhotoCard';
import { TranslationType } from '../../lib/ui-helpers';
import { useGalleryStore } from '../../store';
import { translations } from '../../lib/translations';

interface GalleryGridProps {
  virtuosoRef: React.RefObject<VirtuosoGridHandle | null>;
  gridPhotos: Photo[];
  displayPhotos: Photo[];
  virtuosoComponents?: BaseVirtuosoGridProps<Photo, any>['components'];
  virtuosoContext?: any;
  handleLoadMore: () => void;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onEditPhoto?: (id: string) => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
}

interface MemoizedPhotoCardProps {
  index: number;
  photo: Photo;
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
  index, photo, categories, manufacturers, tagMap, onEditPhoto, onGroupClick, 
  onLightboxOpen, shareSinglePhoto, 
  onTogglePinned, onToggleHidden
}: MemoizedPhotoCardProps) => {
  const isStaffMode = useGalleryStore(s => s.isStaffMode);
  const viewMode = useGalleryStore(s => s.viewMode);
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);
  const lang = useGalleryStore(s => s.appLang);

  const isAdminMode = viewMode === 'admin' || isStaffMode;
  const t = useMemo(() => translations[lang] || translations['zh'], [lang]);

  const handleGroupClickInternal = useCallback((gid: string) => {
    onGroupClick(gid, photo.id);
  }, [onGroupClick, photo.id]);

  return (
    <PhotoCard 
      variant={isAdminMode ? 'admin' : 'public'}
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
});
MemoizedPhotoCard.displayName = 'MemoizedPhotoCard';

export const GalleryGrid: React.FC<GalleryGridProps> = (props) => {
  const columns = useGalleryStore(s => s.columns);
  const setActiveGroupId = useGalleryStore(s => s.setActiveGroupId);
  const setActivePhotoId = useGalleryStore(s => s.setActivePhotoId);
  const setLightboxIndex = useGalleryStore(s => s.setLightboxIndex);

  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
     setActiveGroupId(gid);
     if (photoId) {
       setActivePhotoId(photoId);
     }
  }, [setActiveGroupId, setActivePhotoId]);

  const handleLoadMore = useCallback(() => {
    props.handleLoadMore();
  }, [props.handleLoadMore]);

  const handleEditPhoto = useCallback((id: string) => {
    props.onEditPhoto?.(id);
  }, [props.onEditPhoto]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    const realIndex = props.displayPhotos.findIndex(p => p?.id === photo.id);
    if (realIndex !== -1) {
      setLightboxIndex(realIndex);
    }
  }, [props.displayPhotos, setLightboxIndex]);

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
      overscan={VIRTUOSO_CONFIG.overscan(columns)}
      increaseViewportBy={VIRTUOSO_CONFIG.increaseViewportBy}
      useWindowScroll={false}
      itemClassName="virtuoso-grid-item"
      listClassName={`grid gap-2 px-1.5 py-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
      itemContent={(index, photo) => {
        return (
          <MemoizedPhotoCard
            index={index}
            photo={photo}
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
