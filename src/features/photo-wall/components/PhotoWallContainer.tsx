import { patch } from '#lib/store/index.js';
import React, { useEffect, useRef, useCallback } from 'react';
import { photoWallStore } from '../signal.js';
import { PhotoWallGrid } from './PhotoWallGrid.js';
import { usePhotoWall } from '../hooks/usePhotoWall.js';
import { PhotoListItem } from '#shared/apiContractSchema.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { api } from '#lib/api.js';
import { } from '#lib/store/index.js';
import { useTranslation } from '#src/hooks/index.js';
import { AdminEmptyState } from '#src/pages/AdminPage/AdminEmptyState.js';
import { PhotoErrorDisplay } from '#src/components/photo/PhotoErrorDisplay.js';
import { useUI } from '#src/hooks/ui/useUI.js';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { parseAsPhotoId } from '#lib/nuqs/parsers.js';
import { LocalErrorBoundary } from '#src/components/ui/feedback/LocalErrorBoundary.js';

interface PhotoWallContainerProps {
  mode?: 'admin' | 'public';
  filters?: Record<string, unknown>;
  onPhotoClick?: (photo: PhotoListItem) => void;
}

function arrangePhotosWithGroups(allPhotos: PhotoListItem[]): PhotoListItem[] {
  const coverAndUngrouped: PhotoListItem[] = [];
  const groupChildrenMap = new Map<string, PhotoListItem[]>();

  // 1. Separate cover/ungrouped photos and other group photos
  for (const photo of allPhotos) {
    if (!photo.groupId) {
      coverAndUngrouped.push(photo);
    } else if (photo.isGroupCover) {
      coverAndUngrouped.push(photo);
    } else {
      const children = groupChildrenMap.get(photo.groupId) || [];
      children.push(photo);
      groupChildrenMap.set(photo.groupId, children);
    }
  }

  // 2. Sort group children by groupOrder, then by createdAt or ID
  for (const [groupId, children] of groupChildrenMap.entries()) {
    children.sort((a, b) => {
      const orderA = a.groupOrder ?? 0;
      const orderB = b.groupOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  // 3. Reconstruct the full list, inserting children immediately after their cover
  const result: PhotoListItem[] = [];
  for (const parent of coverAndUngrouped) {
    result.push(parent);
    if (parent.groupId) {
      const children = groupChildrenMap.get(parent.groupId);
      if (children && children.length > 0) {
        result.push(...children);
        // Clear them so we don't double insert
        groupChildrenMap.delete(parent.groupId);
      }
    }
  }

  // 4. If any children are left without a cover photo in the list, append them
  for (const [groupId, children] of groupChildrenMap.entries()) {
    result.push(...children);
  }

  return result;
}

/**
 * PhotoWallContainer
 * 
 * 照片牆核心容器，負責數據加載、Lightbox 協調與狀態同步。
 */
export function PhotoWallContainer(props: PhotoWallContainerProps) {
  const { open: openLightbox, setLightboxData, setLightboxIndex } = useLightbox();
  const { photoId } = useUI();
  const { photos, total, hasMore, isLoading, isLoadingMore, loadMore, error, refresh } = usePhotoWall(props.mode);
  
  const { uiTranslations: labels } = useTranslation();

  const photosRef = useRef(photos);
  photosRef.current = photos;
  const onPhotoClickRef = useRef(props.onPhotoClick);
  onPhotoClickRef.current = props.onPhotoClick;

  const isAggregated = !!props.filters?.onlyGroupsCover;
  const expandedPhotosRef = useRef<PhotoListItem[] | null>(null);

  // 同步總數到全局 UI 狀態
  useEffect(() => {
    if (total !== undefined) {
      patch({ totalCount: total });
    }
  }, [total, patch]);

  const handlePhotoClickStable = useCallback(async (photo: PhotoListItem) => {
    if (onPhotoClickRef.current) {
      onPhotoClickRef.current(photo);
      return;
    }

    const currentPhotos = photosRef.current;
    
    // 如果已有緩存的展開照片，立即使用
    if (isAggregated && expandedPhotosRef.current && expandedPhotosRef.current.length > 0) {
      const allPhotos = expandedPhotosRef.current;
      const expandedSlides = photosToLightboxSlides(allPhotos);
      
      let newIndex = allPhotos.findIndex(p => p.id === photo.id);
      if (newIndex === -1 && photo.groupId) {
        newIndex = allPhotos.findIndex(p => p.groupId === photo.groupId);
      }
      if (newIndex !== -1) {
        openLightbox(expandedSlides, newIndex);
        return;
      }
    }

    // 回退：先用當前列表打開，再後台獲取展開數據
    const slides = photosToLightboxSlides(currentPhotos);
    const index = currentPhotos.findIndex(p => p.id === photo.id);
    openLightbox(slides, index >= 0 ? index : 0);

    if (isAggregated) {
      try {
        const result = await ErrorFactory.unwrap<any>(
          api.photos.list.$post({ 
             json: { 
               ...props.filters as any,
               onlyGroupsCover: false,
               limit: 1000,
               isAdminMode: props.mode === 'admin'
            } 
          }),
          'Failed to load aggregated photos'
        );
        
        const arrangedPhotos = arrangePhotosWithGroups(result.items || []);
        expandedPhotosRef.current = arrangedPhotos; 
        if (arrangedPhotos && arrangedPhotos.length > 0) {
            const expandedSlides = photosToLightboxSlides(arrangedPhotos);
            
            let newIndex = arrangedPhotos.findIndex((p: PhotoListItem) => p.id === photo.id);
            if (newIndex === -1 && photo.groupId) {
                newIndex = arrangedPhotos.findIndex((p: PhotoListItem) => p.groupId === photo.groupId);
            }
            
            if (newIndex !== -1) {
              const currentPhotoId = photoId;
              let finalIndex = newIndex;
              if (currentPhotoId) {
                const indexInNewList = arrangedPhotos.findIndex((p: PhotoListItem) => p.id === currentPhotoId);
                if (indexInNewList !== -1) {
                  finalIndex = indexInNewList;
                }
              }
              setLightboxData(expandedSlides);
              setLightboxIndex(finalIndex);
            }
        }
      } catch (e) {
        ErrorFactory.handle(e as Error, { context: 'Failed to background expand groups for lightbox' });
      }
    }
  }, [openLightbox, setLightboxData, isAggregated, props.mode, props.filters, photoId]);

  // 更新 Store 模式與穩定回調
  useEffect(() => {
    const mode = props.mode || 'public';
    photoWallStore.setState({
      mode,
      onPhotoClick: handlePhotoClickStable,
    });
  }, [props.mode, handlePhotoClickStable]);

  if (error) {
    if (props.mode === 'admin') {
      return (
        <div className="flex flex-col h-full overflow-hidden relative justify-center items-center p-8 w-full">
          <PhotoErrorDisplay error={error} onRetry={refresh} />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 w-full">
        <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 max-w-md">
          <p className="font-bold">加载失败 / Load Failed</p>
          <p className="text-sm opacity-80 mt-1">{error.message}</p>
        </div>
        <button
          onClick={() => refresh()}
          className="px-6 py-2.5 bg-brand-navy text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all font-medium"
        >
          重试 / Retry
        </button>
      </div>
    );
  }

  if (photos.length === 0 && !isLoading) {
    if (props.mode === 'admin') {
      return (
        <div className="flex-1 flex flex-col overflow-hidden relative w-full h-full">
          <AdminEmptyState labels={labels} />
        </div>
      );
    }
    return (
      <div className="text-center py-20 text-gray-500 w-full h-full flex flex-col justify-center items-center min-h-[400px]">
        暂无照片 / No Photos
      </div>
    );
  }

  return (
    <LocalErrorBoundary name="PhotoWallGrid">
      <PhotoWallGrid
        photos={photos}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        isAggregated={isAggregated}
      />
    </LocalErrorBoundary>
  );
}
