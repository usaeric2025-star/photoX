import React, { useCallback, useMemo } from 'react';
import { VirtuosoGrid, VirtuosoGridHandle, VirtuosoGridProps as BaseVirtuosoGridProps } from 'react-virtuoso';
import { motion, AnimatePresence } from 'motion/react';
import { VIRTUOSO_CONFIG } from '../../config/virtuoso.config';
import { Photo, Category, Manufacturer } from '../../types';
import { PhotoCard } from '../photo/PhotoCard';
import { TranslationType } from '../../lib/ui-helpers';
import { useGalleryStore } from '../../store';
import { translations } from '../../lib/translations';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';

interface PhotoGridProps {
  virtuosoRef: React.RefObject<VirtuosoGridHandle | null>;
  gridPhotos: Photo[];
  displayPhotos: Photo[];
  virtuosoComponents?: BaseVirtuosoGridProps<Photo, any>['components'];
  virtuosoContext?: any;
  handleLoadMore: () => void;
  onEditPhoto?: (id: string) => void;
  isInitialLoad?: boolean;
  totalCount?: number;
}

interface MemoizedPhotoCardProps {
  index: number;
  photo: Photo;
  onEditPhoto?: (id: string) => void;
  onGroupClick: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
}

const MemoizedPhotoCard = React.memo(({ 
  index, photo, onEditPhoto, onGroupClick, 
  onLightboxOpen
}: MemoizedPhotoCardProps) => {
  const isStaffMode = useGalleryStore(s => s.isStaffMode);
  const viewMode = useGalleryStore(s => s.viewMode);
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);
  const isAdminMode = viewMode === 'admin' || isStaffMode;

  const handleGroupClickInternal = useCallback((gid: string) => {
    onGroupClick(gid, photo.id);
  }, [onGroupClick, photo.id]);

  return (
    <PhotoCard 
      variant={isAdminMode ? 'admin' : 'public'}
      photo={photo}
      index={index}
      showGroupsCollapsed={showGroupsCollapsed}
      onEditPhoto={onEditPhoto}
      onGroupClick={handleGroupClickInternal}
      onLightboxOpen={onLightboxOpen}
    />
  );
});
MemoizedPhotoCard.displayName = 'MemoizedPhotoCard';

function getSkeletonCount(total: number = 0, columns: number): number {
  if (total > 0) return Math.min(total, columns * 3);
  return columns * 3;
}

console.log('PhotoGrid module loading');

export const PhotoBoard: React.FC<PhotoGridProps> = (props) => {
  console.log('Rendering PhotoBoard');
  const columns = useGalleryStore(s => s.columns);
  const setActiveGroupId = useGalleryStore(s => s.setActiveGroupId);
  const setActivePhotoId = useGalleryStore(s => s.setActivePhotoId);
  const setLightboxIndex = useGalleryStore(s => s.setLightboxIndex);
  const lang = useGalleryStore(s => s.appLang);
  const t = translations[lang] || translations['zh'];

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

  if (props.isInitialLoad) {
    const skeletonCount = getSkeletonCount(props.totalCount, columns);
    return (
      <motion.div 
        key="skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-10 bg-brand-bg relative"
      >
        <GallerySkeleton columns={columns} count={skeletonCount} />
      </motion.div>
    );
  }

  if (props.gridPhotos.length === 0) {
    return (
      <motion.div
         key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full relative"
      >
        <GalleryEmpty t={t} />
      </motion.div>
    );
  }

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
            onEditPhoto={handleEditPhoto}
            onGroupClick={handleGroupClick}
            onLightboxOpen={handleLightboxOpen}
          />
        );
      }}
    />
  );
};

export default PhotoBoard;
