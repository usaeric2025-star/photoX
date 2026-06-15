import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useEffect, useMemo } from "react";
import { useFilters, useUIStore } from '@/hooks';
import { usePhoto } from "./usePhoto";
import { useGroupPhotos, usePhotos } from "./usePhotos";
import { useGroupDetail } from "../groups/useGroupDetail";
import { useQuery } from '@tanstack/react-query';
import { getPhotoCount } from "@/services/photo";
import { Photo } from "@/types";
import { PAGINATION, PHOTO_QUERY_CONFIG } from "@/constants/config";

/**
 * [ATOMIC-HOOK] useLightbox
 * Business logic for the photo lightbox system. 
 * Redesigned in v2.15 to follow URL-only truth and unified mode logic.
 */
export const useLightbox = () => {
  const navigate = useRouterSafe().navigate;
  const location = useRouterSafe().location;
  const params = useRouterSafe().params as any;
  
  const { photoId, groupId: uiGroupId, setGroupId, setPhotoId, category, tags, search, sort, showGroupsCollapsed, status } = useFilters();
  
  const dataFilters = useMemo(() => ({
    categoryId: category || null,
    tagId: tags?.[0] || null,
    searchQuery: search || '',
    sortOrder: sort || 'newest',
    showGroupsCollapsed: showGroupsCollapsed !== false,
    is_hidden: status === 'hidden',
    onlyUngrouped: false,
    manufacturerId: null,
  }), [category, tags, search, sort, showGroupsCollapsed, status]);

  const parsedGroupId = location.pathname.match(/\/group\/([^\/]+)/)?.[1] || location.pathname.match(/\/admin\/group\/([^\/]+)/)?.[1];
  const groupId = uiGroupId || params.groupId || parsedGroupId;
  
  const isAdmin = location.pathname.startsWith('/admin');
  
  // Use enabled condition to avoid unnecessary requests
  const { data: singlePhoto, isLoading: isSingleLoading } = usePhoto(photoId || '');
  const groupPhotosQuery = useGroupPhotos(groupId, isAdmin, 40);
  const { data: groupDetail, isLoading: isGroupLoading } = useGroupDetail({ groupId: groupId || '', isAdmin });
  const isPhotosLoading = groupPhotosQuery.isLoading;

  const photoFilters = ({
    category_id: dataFilters.categoryId,
    tag_id: dataFilters.tagId,
    manufacturer_id: dataFilters.manufacturerId,
    searchQuery: dataFilters.searchQuery,
    sortOrder: dataFilters.sortOrder,
    isAdminMode: isAdmin,
    onlyUngrouped: false,
    is_hidden: dataFilters.is_hidden,
    limit: PHOTO_QUERY_CONFIG.limit
  });

  const { data: allGalleryPhotos, isLoading: isGalleryLoading } = usePhotos(photoFilters, { enabled: !groupId });
  
  const isGroupMode = !!groupId; // Within a group's context
  
  const photos = (() => {
    let list: Photo[] = [];
    const allPhotosList = isGroupMode 
        ? (groupPhotosQuery.photos || [])
        : (allGalleryPhotos?.photos || (allGalleryPhotos?.pages as any[])?.flatMap(page => page.photos) || []);
    
    if (singlePhoto) {
      list = allPhotosList.map((p: any) => p.id === singlePhoto.id ? { ...p, ...singlePhoto } : p);
      if (!list.find((p: any) => p.id === singlePhoto.id)) {
        list = [...list, singlePhoto]; // ensure we append to avoid messing up start of list if we couldn't find it
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
  })();

  const { data: countResult } = useQuery({
    queryKey: ['photos', 'totalCount', dataFilters, groupId, isAdmin],
    queryFn: async () => {
      if (groupId) {
        return groupDetail?.member_count ?? photos.length;
      }
      return await getPhotoCount(dataFilters.categoryId, dataFilters.tagId, dataFilters.searchQuery, isAdmin);
    },
    enabled: !!(photoId || groupId)
  });
  
  const totalCount = countResult ?? (groupId ? (groupDetail?.member_count ?? photos.length) : 0);
  
  const isLoading = isSingleLoading || (isGroupMode ? (isGroupLoading || isPhotosLoading) : isGalleryLoading);

  const currentIndex = (() => {
    if (!photoId || photos.length === 0) return 0;
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx === -1) return 0;
    return idx;
  })();

  const isOpen = !!photoId;
  // Use a safely indexed access, or null if idx is -1
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null;
  
  const close = () => {
    return navigate({
      to: '.',
      search: (prev: any) => ({ ...prev, photoId: undefined } as any),
      replace: true,
      resetScroll: false
    });
  };
  
  // Rule 5: Standard return values
  const mode = groupId ? 'group' : 'single';
  
  // Smart Prefetch: Preload neighbor images into browser cache
  useEffect(() => {
    if (photoId && photos.length > 0) {
      const nextIdx = (currentIndex + 1) % photos.length;
      const prevIdx = (currentIndex - 1 + photos.length) % photos.length;
      
      const targets = [photos[nextIdx], photos[prevIdx]];
      targets.forEach(p => {
        if (p?.image_url) {
          const img = new Image();
          img.src = p.image_url;
        }
      });
    }
  }, [photoId, photos, currentIndex]);
  
  const currentLang = useUIStore(s => s.appLang);

  const items = useMemo(() => {
    return photos.map(p => ({
      id: p.id,
      src: p.image_url,
      thumbnail: p.thumbnail_sm_url || p.image_url,
      title: typeof p.name === 'object' ? (p.name[currentLang] || p.name.zh || p.name.en || '') : p.name,
      description: typeof p.description === 'object' ? (p.description?.[currentLang] || p.description?.zh || p.description?.en || '') : p.description,
      exif: p.exif_data as any
    }));
  }, [photos, currentLang]);

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
    items,
    totalCount,
    showEdit: isAdmin,
    showDelete: isAdmin,
    showAi: isAdmin && mode === 'single'
  };
};
