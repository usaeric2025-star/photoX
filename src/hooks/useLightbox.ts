import { useUrlFilters } from "./useUrlFilters";
import { usePhotoDetail } from "./core/queries/usePhotoDetail";
import { useGroupPhotos } from "./core/queries/usePhotos";
import { useGroupDetail } from "./core/queries/useGroupDetail";
import { useMemo } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Photo } from "@/types";

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
  
  const isGroupMode = !!groupId; // Within a group's context
  
  const isLoading = isSingleLoading || (isGroupMode && (isGroupLoading || isPhotosLoading));

  const photos = useMemo(() => {
    let list: Photo[] = [];
    if (!!groupId) {
      // Flatten infinite query pages for the lightbox if in group context
      const allPhotos = groupPhotos?.pages.flatMap(page => page.photos) ?? [];
      // If we have a single photo already, ensure it's in the list if not fetched yet
      if (singlePhoto && !allPhotos.find(p => p.id === singlePhoto.id)) {
        list = [singlePhoto, ...allPhotos];
      } else {
        list = allPhotos;
      }
    } else {
      list = singlePhoto ? [singlePhoto] : [];
    }

    // Keep unique photos by checking their stable ids
    const seen = new Set<string>();
    return list.filter((p) => {
      if (!p || !p.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [groupId, groupPhotos, singlePhoto]);

  const currentIndex = useMemo(() => {
    if (!photoId || photos.length === 0) return 0;
    const idx = photos.findIndex(p => p.id === photoId);
    return idx === -1 ? 0 : idx;
  }, [photos, photoId]);

  const isOpen = !!photoId;
  const currentPhoto = photos[currentIndex];
  
  const close = () => {
    if (groupId) {
      // In a group context: keep the group, only clear the photo
      navigate({
        to: isAdmin ? '/admin/group/$groupId' : '/group/$groupId',
        params: { groupId },
        search: (prev: any) => ({ ...prev, photoId: undefined })
      });
    } else {
      // Single photo mode: go back to list
      navigate({
        to: isAdmin ? '/admin' : '/',
        search: (prev: any) => ({ ...prev, photoId: undefined })
      });
    }
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
    showEdit: isAdmin,
    showDelete: isAdmin,
    showAi: isAdmin && mode === 'single'
  };
};
