import { useState, useMemo, useRef, useEffect } from 'react';
import { Photo, DB_Category, Category, Tag } from '../types';

interface UseGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  dbCategories: DB_Category[];
  columns: 2 | 3 | 5;
}

export const useGallery = ({ photos, categories, tags, dbCategories, columns }: UseGalleryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(15);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const setSearchQueryAndReset = (query: string) => {
    setSearchQuery(query);
    setVisibleCount(15);
  };

  const setSelectedCatCodeAndReset = (code: string | null) => {
    setSelectedCatCode(code);
    setVisibleCount(15);
  };

  const setSelectedSubIdAndReset = (id: string | null) => {
    setSelectedSubId(id);
    setVisibleCount(15);
  };

  const setSelectedTagIdsAndReset = (action: string[] | ((prev: string[]) => string[])) => {
    setSelectedTagIds(action);
    setVisibleCount(15);
  };

  const displayPhotos = useMemo(() => {
    let filtered = photos;
    if (selectedCatCode) {
      const activeCat = dbCategories.find(c => c.code === selectedCatCode);
      filtered = filtered.filter(p => 
        p.category === selectedCatCode || 
        p.category === activeCat?.zh || 
        p.categoryId === selectedCatCode
      );
    }
    
    if (selectedSubId) {
      const activeSub = categories.flatMap(c => c.subcategories).find(s => s.id === selectedSubId);
      filtered = filtered.filter(p => p.subcategoryId === selectedSubId || p.sub_category === activeSub?.name);
    }

    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(p => {
        const pTags = p.tags || [];
        const pTagIds = p.tagIds || [];
        return selectedTagIds.every(tid => {
          const tagName = tags.find(t => t.id === tid)?.name;
          return pTagIds.includes(tid) || (tagName && pTags.includes(tagName));
        });
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const mappedTagNames = (p.tagIds || []).map(tid => tags.find(t => t.id === tid)?.name).filter(Boolean);
        
        const searchableText = [
          p.name,
          p.description,
          ...(p.tags || []),
          ...mappedTagNames,
          dbCategories.find(c => c.code === p.category)?.zh || '',
          dbCategories.find(c => c.code === p.category)?.en || '',
          dbCategories.find(c => c.code === p.category)?.ms || ''
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(q);
      });
    }

    return filtered;
  }, [photos, selectedCatCode, selectedSubId, selectedTagIds, searchQuery, dbCategories, categories, tags]);

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
    searchQuery, setSearchQuery: setSearchQueryAndReset,
    selectedCatCode, setSelectedCatCode: setSelectedCatCodeAndReset,
    selectedSubId, setSelectedSubId: setSelectedSubIdAndReset,
    selectedTagIds, setSelectedTagIds: setSelectedTagIdsAndReset,
    showGroupsCollapsed, setShowGroupsCollapsed,
    visibleCount, setVisibleCount,
    lightboxIndex, setLightboxIndex,
    displayPhotos: aggregatedPhotos, // For lightbox indexed access
    totalPhotoCount, // Added this
    visiblePhotos, gridPhotos,
    getRealId, observerTarget
  };
};
