import { useState, useMemo, useRef, useEffect } from 'react';
import { Photo, DB_Category, Category, Tag } from '../types';
import { sanitizePhotoTags } from '../lib/sanitizer';

interface UseGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  dbCategories: DB_Category[];
  columns: 2 | 3 | 5;
  isAdminMode?: boolean;
  externalSortOrder?: 'asc' | 'desc';
  externalSearchQuery?: string;
  externalSelectedCatCode?: string | null;
  externalSelectedSubId?: string | null;
  externalSelectedTagIds?: string[];
}

export const useGallery = ({ 
  photos, categories, tags, dbCategories, columns, isAdminMode = false, 
  externalSortOrder, externalSearchQuery, 
  externalSelectedCatCode, externalSelectedSubId, externalSelectedTagIds 
}: UseGalleryProps) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSelectedCatCode, setInternalSelectedCatCode] = useState<string | null>(null);
  const [internalSelectedSubId, setInternalSelectedSubId] = useState<string | null>(null);
  const [internalSelectedTagIds, setInternalSelectedTagIds] = useState<string[]>([]);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(15);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [internalSortOrder, setInternalSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortOrder = externalSortOrder || internalSortOrder;
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const selectedCatCode = externalSelectedCatCode !== undefined ? externalSelectedCatCode : internalSelectedCatCode;
  const selectedSubId = externalSelectedSubId !== undefined ? externalSelectedSubId : internalSelectedSubId;
  const selectedTagIds = externalSelectedTagIds !== undefined ? externalSelectedTagIds : internalSelectedTagIds;

  const toggleSortOrder = () => {
    setInternalSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setVisibleCount(15);
  };

  const setSearchQuery = (query: string) => {
    setInternalSearchQuery(query);
    setVisibleCount(15);
  };

  const setSelectedCatCode = (code: string | null) => {
    setInternalSelectedCatCode(code);
    setVisibleCount(15);
  };

  const setSelectedSubId = (id: string | null) => {
    setInternalSelectedSubId(id);
    setVisibleCount(15);
  };

  const setSelectedTagIds = (action: string[] | ((prev: string[]) => string[])) => {
    if (typeof action === 'function') {
      setInternalSelectedTagIds(action);
    } else {
      setInternalSelectedTagIds(action);
    }
    setVisibleCount(15);
  };

  const displayPhotos = useMemo(() => {
    // Sanitization: remove missing tags
    const sanitized = photos.map(p => sanitizePhotoTags(p, tags));
    
    let filtered = isAdminMode ? sanitized : sanitized.filter(p => !p.isHidden);
    
    if (selectedCatCode) {
      filtered = filtered.filter(p => {
        if (p.categoryId === selectedCatCode) return true;
        
        const dbCat = dbCategories.find(c => c.code === selectedCatCode);
        const catStr = (p.categoryId || (p as any).category || '').trim().toLowerCase();
        
        return dbCat && (
          catStr === dbCat.code.toLowerCase() ||
          catStr === dbCat.zh.trim().toLowerCase() ||
          catStr === dbCat.en.trim().toLowerCase() ||
          catStr === dbCat.ms.trim().toLowerCase()
        );
      });
    }
    
    if (selectedSubId) {
      filtered = filtered.filter(p => {
        if (p.subcategoryId === selectedSubId) return true;

        let subName = '';
        categories.forEach(c => {
          const sub = c.subcategories.find(s => s.id === selectedSubId);
          if (sub) subName = sub.name.trim().toLowerCase();
        });
        
        const subStr = (p.subcategoryId || (p as any).sub_category || '').trim().toLowerCase();
        return subStr && subStr === subName;
      });
    }

    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(p => {
        const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
        
        return selectedTagIds.every(tid => {
          if (rawTagIds.includes(tid)) return true;
          
          const tObj = tags.find(t => t.id === tid);
          if (tObj) {
            return rawTagIds.some((rt: string) => rt.trim().toLowerCase() === tObj.name.trim().toLowerCase());
          }
          return false;
        });
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
        const mappedTagNames = rawTagIds.map(tid => tags.find(t => t.id === tid)?.name).filter(Boolean);
        
        const searchableText = [
          p.name,
          p.description,
          ...mappedTagNames,
          dbCategories.find(c => c.code === p.categoryId)?.zh || '',
          dbCategories.find(c => c.code === p.categoryId)?.en || '',
          dbCategories.find(c => c.code === p.categoryId)?.ms || ''
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
  }, [photos, selectedCatCode, selectedSubId, selectedTagIds, searchQuery, dbCategories, categories, tags, sortOrder, isAdminMode]);

  const totalPhotoCount = displayPhotos.length;

  const aggregatedPhotos = useMemo(() => {
    let sorted = [...displayPhotos];
    if (showGroupsCollapsed) {
      const groupsSeen = new Set<string>();
      sorted = sorted.filter(p => {
        if (!p.groupId) return true;
        if (groupsSeen.has(p.groupId)) return false;
        groupsSeen.add(p.groupId);
        return true;
      });
    }
    return sorted;
  }, [displayPhotos, showGroupsCollapsed]);

  const visiblePhotos = useMemo(() => {
    if (aggregatedPhotos.length === 0) return [];
    
    // Cap visible count to avoid excessive memory usage if it keeps increasing
    const count = Math.min(visibleCount, aggregatedPhotos.length);
    return aggregatedPhotos.slice(0, count);
  }, [aggregatedPhotos, visibleCount]);

  const gridPhotos = useMemo(() => {
    if (visiblePhotos.length === 0 || aggregatedPhotos.length === 0) return visiblePhotos;
    const remainder = visiblePhotos.length % columns;
    if (remainder === 0) return visiblePhotos;
    
    // In normal gallery we don't necessarily need fillers, but let's keep it clean
    return visiblePhotos;
  }, [visiblePhotos, columns, aggregatedPhotos]);

  const getRealId = (loopId: string) => loopId.split('-loop-')[0].split('-filler-')[0];

  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < aggregatedPhotos.length) {
          setVisibleCount(prev => prev + 12);
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
    totalPhotoCount: aggregatedPhotos.length,
    visiblePhotos, gridPhotos,
    getRealId, observerTarget,
    sortOrder, toggleSortOrder
  };
};
