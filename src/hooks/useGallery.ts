import { useState, useMemo, useRef, useEffect } from 'react';
import { Photo, Category, Tag } from '../types';
import { sanitizePhotoTags } from '../lib/sanitizer';
import { normalizeSearchQuery } from '../utils/stringHelper';
import { PAGINATION } from '../constants/config';
import { groupPhotos } from '../lib/filters';
import { safeArray } from '../lib/utils';

interface UseGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  columns: 2 | 3 | 5;
  isAdminMode?: boolean;
  isStaffMode?: boolean;
  externalSortOrder?: 'asc' | 'desc';
  externalSearchQuery?: string;
  externalSelectedCatCode?: string | null;
  externalSelectedSubId?: string | null;
  externalSelectedTagIds?: string[];
}

export const useGallery = ({ 
  photos, categories, tags, columns, isAdminMode = false, isStaffMode = false,
  externalSortOrder, externalSearchQuery, 
  externalSelectedCatCode, externalSelectedSubId, externalSelectedTagIds 
}: UseGalleryProps) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSelectedCatCode, setInternalSelectedCatCode] = useState<string | null>(null);
  const [internalSelectedSubId, setInternalSelectedSubId] = useState<string | null>(null);
  const [internalSelectedTagIds, setInternalSelectedTagIds] = useState<string[]>([]);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGINATION.LAZY_LOAD_COUNT);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [internalSortOrder, setInternalSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortOrder = externalSortOrder || internalSortOrder;
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const selectedCatCode = externalSelectedCatCode !== undefined ? externalSelectedCatCode : internalSelectedCatCode;
  const selectedSubId = externalSelectedSubId !== undefined ? externalSelectedSubId : internalSelectedSubId;
  const selectedTagIds = externalSelectedTagIds !== undefined ? externalSelectedTagIds : externalSelectedTagIds;

  const toggleSortOrder = () => {
    setInternalSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setVisibleCount(PAGINATION.LAZY_LOAD_COUNT);
  };

  const setSearchQuery = (query: string) => {
    setInternalSearchQuery(query);
    setVisibleCount(PAGINATION.LAZY_LOAD_COUNT);
  };

  const setSelectedCatCode = (code: string | null) => {
    setInternalSelectedCatCode(code);
    setVisibleCount(PAGINATION.LAZY_LOAD_COUNT);
  };

  const setSelectedSubId = (id: string | null) => {
    setInternalSelectedSubId(id);
    setVisibleCount(PAGINATION.LAZY_LOAD_COUNT);
  };

  const setSelectedTagIds = (action: string[] | ((prev: string[]) => string[])) => {
    if (typeof action === 'function') {
      setInternalSelectedTagIds(action);
    } else {
      setInternalSelectedTagIds(action);
    }
    setVisibleCount(PAGINATION.LAZY_LOAD_COUNT);
  };

  const displayPhotos = useMemo(() => {
    // Sanitization: remove missing tags
    const sanitized = safeArray(photos).map(p => sanitizePhotoTags(p, tags));
    
    let filtered = (isAdminMode || isStaffMode) ? sanitized : sanitized.filter(p => !p.isHidden);
    
    if (selectedCatCode) {
      filtered = filtered.filter(p => p.categoryId === selectedCatCode);
    }
    
    if (selectedSubId) {
      filtered = filtered.filter(p => p.manufacturerId === selectedSubId);
    }

    const sSelectedTagIds = safeArray(selectedTagIds);
    if (sSelectedTagIds.length > 0) {
      filtered = filtered.filter(p => {
        const rawTagIds = safeArray(p.tagIds).map(String);
        
        return sSelectedTagIds.every(tid => {
          const strTid = String(tid);
          if (rawTagIds.includes(strTid)) return true;
          
          const tObj = safeArray(tags).find(t => String(t.id) === strTid);
          if (tObj) {
            return rawTagIds.some((rt: string) => rt.trim().toLowerCase() === (tObj.name || '').trim().toLowerCase());
          }
          return false;
        });
      });
    }

    const normSearchQuery = normalizeSearchQuery(searchQuery);
    if (normSearchQuery) {
      const q = (normSearchQuery || '').toLowerCase();
      filtered = filtered.filter(p => {
        const rawTagIds = safeArray(p.tagIds).map(String);
        const mappedTagNames = rawTagIds.map(tid => safeArray(tags).find(t => String(t.id) === tid)?.name).filter(Boolean);
        
        const searchableText = [
          p.name,
          p.description,
          ...mappedTagNames,
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(q);
      });
    }

    filtered.sort((a, b) => {
      // Safely parse timestamps or fallback
      const timeA = new Date(a.createdAt || (a as any).created_at || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).created_at || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [photos, selectedCatCode, selectedSubId, selectedTagIds, searchQuery, categories, tags, sortOrder, isAdminMode, isStaffMode]);

  const totalPhotoCount = safeArray(displayPhotos).length;

  const aggregatedPhotos = useMemo(() => {
    return groupPhotos(displayPhotos, showGroupsCollapsed);
  }, [displayPhotos, showGroupsCollapsed]);

  const visiblePhotos = useMemo(() => {
    const sAggregated = safeArray(aggregatedPhotos);
    if (sAggregated.length === 0) return [];
    
    // Cap visible count to avoid excessive memory usage if it keeps increasing
    const count = Math.min(visibleCount, sAggregated.length);
    return sAggregated.slice(0, count);
  }, [aggregatedPhotos, visibleCount]);

  const gridPhotos = useMemo(() => {
    const sVisible = safeArray(visiblePhotos);
    const sAggregated = safeArray(aggregatedPhotos);
    if (sVisible.length === 0 || sAggregated.length === 0) return sVisible;
    const remainder = sVisible.length % columns;
    if (remainder === 0) return sVisible;
    
    // In normal gallery we don't necessarily need fillers, but let's keep it clean
    return sVisible;
  }, [visiblePhotos, columns, aggregatedPhotos]);

  const getRealId = (loopId: string) => loopId.split('-loop-')[0].split('-filler-')[0];

  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const sAggregated = safeArray(aggregatedPhotos);
        if (entries[0].isIntersecting && visibleCount < sAggregated.length) {
          setVisibleCount(prev => prev + PAGINATION.LAZY_LOAD_COUNT);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [aggregatedPhotos.length, visibleCount]);

  return {
    searchQuery, setSearchQuery,
    selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId,
    selectedTagIds, setSelectedTagIds,
    showGroupsCollapsed, setShowGroupsCollapsed,
    visibleCount, setVisibleCount,
    lightboxIndex, setLightboxIndex,
    displayPhotos: aggregatedPhotos, // For lightbox indexed access
    totalPhotoCount: safeArray(aggregatedPhotos).length,
    visiblePhotos, gridPhotos,
    getRealId, observerTarget,
    sortOrder, toggleSortOrder
  };
};
