import { useUrlFilters } from "./useUrlFilters";
import { usePhotoDetail } from "./core/queries/usePhotoDetail";
import { useGroupPhotos, usePhotos } from "./core/queries/usePhotos";
import { useGroupDetail } from "./core/queries/useGroupDetail";
import { useQuery } from '@tanstack/react-query';
import { getPhotoCount } from "@/services/photo/queries";
import { useMemo } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Photo } from "@/types";
import { PAGINATION } from "@/constants/config";
import { PHOTO_QUERY_CONFIG } from "@/lib/photoQueryConfig";

/**
 * [ATOMIC-HOOK] useLightbox
 * Business logic for the photo lightbox system. 
 * Redesigned in v2.15 to follow URL-only truth and unified mode logic.
 */
export const useLightbox = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { filters, setPhotoId, setGroupId } = useUrlFilters();
  const { photoId, groupId } = filters;
  
  const isAdmin = location.pathname.startsWith('/admin');
  
  // Use enabled condition to avoid unnecessary requests
  const { data: singlePhoto, isLoading: isSingleLoading } = usePhotoDetail(photoId || '');
  const { data: groupDetail, isLoading: isGroupLoading } = useGroupDetail(groupId || '');
  const { data: groupPhotos, isLoading: isPhotosLoading } = useGroupPhotos(groupId, false, 100);
  const { data: allGalleryPhotos, isLoading: isGalleryLoading } = usePhotos({
    category_id: filters.categoryId,
    tag_id: filters.tagId,
    manufacturer_id: filters.manufacturerId,
    searchQuery: filters.searchQuery,
    sortOrder: filters.sortOrder,
    isAdminMode: isAdmin,
    onlyUngrouped: false,
    is_hidden: filters.is_hidden,
  }, PHOTO_QUERY_CONFIG.limit, !groupId);
  
  const { data: totalCount } = useQuery({
    queryKey: ['photos', 'totalCount', filters],
    queryFn: () => getPhotoCount(filters.categoryId, filters.tagId, filters.searchQuery, isAdmin),
    enabled: !groupId,
  });
  
  const isGroupMode = !!groupId; // Within a group's context
  
  const isLoading = isSingleLoading || (isGroupMode ? (isGroupLoading || isPhotosLoading) : isGalleryLoading);

  const photos = useMemo(() => {
    let list: Photo[] = [];
    const sourceData = isGroupMode ? groupPhotos : allGalleryPhotos;
    const allPhotosList = sourceData?.pages.flatMap(page => page.photos) ?? [];
    
    if (singlePhoto) {
      list = allPhotosList.map(p => p.id === singlePhoto.id ? { ...p, ...singlePhoto } : p);
      if (!list.find(p => p.id === singlePhoto.id)) {
        list = [singlePhoto, ...list];
      }
    } else {
      list = allPhotosList;
    }

    // Keep unique photos by checking their stable ids
    const seen = new Set<string>();
    return list.filter((p) => {
      if (!p || !p.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [groupId, groupPhotos, allGalleryPhotos, singlePhoto, isGroupMode]);

  const currentIndex = useMemo(() => {
    if (!photoId || photos.length === 0) return 0;
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx === -1) return 0;
    return idx;
  }, [photos, photoId]);

  const isOpen = !!photoId;
  // Use a safely indexed access, or null if idx is -1
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null;
  
  const close = () => {
    navigate({
      to: location.pathname,
      search: (prev: any) => ({ ...prev, photoId: undefined }),
      replace: true
    });
  };
  
  // Rule 5: Standard return values
  const mode = groupId ? 'group' : 'single';
  
  return { 
    isOpen, 
    close, 
    photos, 
    currentIndex, 
    isGroupMode, 
    groupId, 
    photoId, 
    setPhotoId,
    mode,
    isLoading,
    // When in groupDetail but photoId is also present, 'data' for info panel is the photo
    // except if the user specifically wants the group info? 
    // Usually a photo-lightbox sidebar shows the photo info.
    // However, if photoId is NOT present but we are in a group-detail page... 
    // wait, isOpen is only true if photoId is present.
    data: mode === 'group' ? (currentPhoto || groupDetail) : currentPhoto,
    items: photos,
    totalCount,
    showEdit: isAdmin,
    showDelete: isAdmin,
    showAi: isAdmin && mode === 'single'
  };
};
