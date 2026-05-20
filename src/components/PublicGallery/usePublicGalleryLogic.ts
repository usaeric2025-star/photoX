import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { sortTagsByPopularity } from '../../utils/tagUtils';
import { useGalleryStore } from '../../store';
import { useCategoriesQuery, useTagsQuery, useManufacturersQuery } from '../../hooks';
import { translations, LanguageCode } from '../../lib/translations';
import { filterPhotos, groupPhotos } from '../../lib/filters';
import { isValidPhoto } from '../../lib/typeGuard';
import { getPhotoDisplayName } from '../../lib/ui-helpers';
import { saveData, loadData } from '../../utils/indexedDB';

import { useAdminMode, usePhotoFilters, useFeedback } from '../../hooks';
import { globalHandleError } from '../../utils/errorHandler';

export const usePublicGalleryLogic = (props: {
  photos: Photo[];
  categories: Category[];
  settings?: AppSettings;
  user?: User | null;
  isAdminMode?: boolean;
  isRefreshing?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  selectedIds?: string[];
  isMultiSelect?: boolean;
  onToggleSelection?: (id: string) => void;
  onClearSelection?: () => void;
  onToggleMultiSelect?: () => void;
  initialHash?: string;
  initialGroupId?: string;
  onRefresh?: () => void;
  columns?: 2 | 3 | 5;
  setColumns?: (val: 2 | 3 | 5) => void;
}) => {
  const {
    photos: incomingPhotos,
    categories: propCategories,
    settings: propsSettings,
    user: propsUser,
    isAdminMode: propIsAdminMode,
    isRefreshing: propsIsRefreshing,
    onLoadMore,
    hasMore,
    selectedIds = [],
    isMultiSelect = false,
    onToggleSelection,
    onClearSelection,
    onToggleMultiSelect,
    initialHash,
    initialGroupId,
    onRefresh
  } = props;

  const hookIsAdminMode = useAdminMode();
  const isAdminMode = propIsAdminMode !== undefined ? propIsAdminMode : hookIsAdminMode;

  const navigate = useNavigate();
  const settings = propsSettings;
  const user = propsUser;
  const isSyncing = propsIsRefreshing;

  const {
    searchQuery, setSearchQuery,
    filterCatId: selectedCatCode, setFilterCatId: setSelectedCatCode,
    filterSubId: selectedSubId, setFilterSubId: setSelectedSubId,
    filterTagIds: selectedTagIds, setFilterTagIds: setSelectedTagIds,
    sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed,
    isStaffMode, setIsStaffMode,
    selectedIds: storeSelectedIds,
    isMultiSelect: storeIsMultiSelect,
    togglePhotoSelection,
    clearSelection,
    setIsMultiSelect: setStoreIsMultiSelect,
    appLang: langStore,
    setAppLang: setLang,
    tagStats,
    setTagStats
  } = useGalleryStore();

  const { data: qCategories = [] } = useCategoriesQuery();
  const { data: qManufacturers = [] } = useManufacturersQuery();
  const { data: qTags = [] } = useTagsQuery();

  const categories = propCategories || qCategories || [];
  const manufacturers = qManufacturers;
  const contextTags = qTags;

  const localPhotos = useMemo(() => incomingPhotos || [], [incomingPhotos]);
  const activeSelectedIds = selectedIds.length > 0 || isMultiSelect ? selectedIds : storeSelectedIds;
  const activeIsMultiSelect = isMultiSelect || storeIsMultiSelect;
  const activeToggleSelection = onToggleSelection || togglePhotoSelection;
  const activeClearSelection = onClearSelection || clearSelection;
  const activeSetIsMultiSelect = onToggleMultiSelect || setStoreIsMultiSelect;

  const { showSuccess, showError } = useFeedback();

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    incomingPhotos && incomingPhotos.length > 0 ? incomingPhotos : localPhotos,
    categories,
    contextTags,
    {
      showGroupsCollapsed,
      isAdminModeOverride: propIsAdminMode
    }
  );

  const lang = (langStore || 'en') as LanguageCode;
  const t = useMemo(() => translations[lang] || translations['en'], [lang]);

  const [internalColumns, setInternalColumns] = useState<2 | 3 | 5>(() => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width >= 1024) return 5;
    return 3;
  });
  const columns = props.columns || internalColumns;
  const setColumns = props.setColumns || setInternalColumns;

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialHash && lightboxIndex === null && displayPhotos.length > 0) {
      const idx = displayPhotos.findIndex(p => p.image_hash === initialHash);
      if (idx !== -1) setLightboxIndex(idx);
    }
  }, [initialHash, displayPhotos, lightboxIndex]);

  useEffect(() => {
    if (initialGroupId && activeGroupId === null && localPhotos.length > 0) {
      const groupExists = localPhotos.some(p => p.groupId === initialGroupId);
      if (groupExists) setActiveGroupId(initialGroupId);
    }
  }, [initialGroupId, localPhotos, activeGroupId]);

  const tagMap = useMemo(() => {
    const map: Record<string, string> = {};
    contextTags.forEach(t => { map[String(t.id)] = t.name; });
    return map;
  }, [contextTags]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder, setSortOrder]);

  const virtuosoRef = useRef<any>(null);
  const scrollToTop = () => virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });

  const [showWhatsAppChoice, setShowWhatsAppChoice] = useState(false);
  const getShareMessage = useCallback((p: Photo) => {
    const displayName = getPhotoDisplayName(p, categories, lang, t);
    const suffix = isStaffMode ? (p.manual_code ? ` [${p.manual_code}]` : '') : (p.model_number ? ` (${p.model_number})` : '');
    const shareUrl = `${window.location.origin}/h/${p.image_hash}`;

    if (lang === 'ms') return `Halo, saya berminat dengan perabot ini:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    if (lang === 'en') return `Hello, I'm interested in this furniture:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    return `你好，我对这个家具有兴趣：\n\n${displayName}${suffix}\n\n链接: ${shareUrl}`;
  }, [categories, lang, t, isStaffMode]);

  const openWhatsApp = (num: string, photo?: Photo) => {
    if (!num) return;
    let msg = photo ? getShareMessage(photo) : (lang === 'ms' ? `Halo, saya ingin bertanya tentang maklumat perabot.` : lang === 'en' ? `Hello, I'd like to inquire about furniture information.` : `你好，我想咨询家具信息。`);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsAppChoice(false);
  };

  const shareSinglePhoto = useCallback((photo: Photo) => {
    const msg = getShareMessage(photo);
    if (navigator.share) {
      navigator.share({ title: t.shareTitle, text: msg }).catch(e => { if (e.name !== 'AbortError') globalHandleError(e, "Single Share", true); });
    } else {
      navigator.clipboard.writeText(msg)
        .then(() => showSuccess("分享信息已复制到剪贴板！/ Share info copied to clipboard!"))
        .catch(e => showError(e, '复制分享信息失败'));
    }
  }, [t.shareTitle, getShareMessage, showSuccess]);

  const shareGroup = useCallback((photos: Photo[]) => {
    const validPhotos = photos.filter(p => !!p);
    const gId = validPhotos[0]?.groupId || activeGroupId;
    const shareUrl = `${window.location.origin}/g/${gId}`;
    const msg = validPhotos.map(p => p.name || 'Furniture').slice(0, 3).join(', ') + (validPhotos.length > 3 ? '...' : '');
    const shareText = `${t.sharePrompt}\n\n${t.shareTitle}: ${msg}\n\nView full collection: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({ title: t.shareTitle, text: shareText }).catch(e => { if (e.name !== 'AbortError') globalHandleError(e, "Group share", true); });
    } else {
      navigator.clipboard.writeText(shareText)
        .then(() => showSuccess("群组分享链接已复制！/ Group share link copied!"))
        .catch(e => showError(e, '复制群组链接失败'));
    }
  }, [t, activeGroupId, showSuccess]);

  const handleLoadMore = useCallback(() => {
    if (onLoadMore && hasMore && !isSyncing) onLoadMore();
  }, [onLoadMore, hasMore, isSyncing]);

  const hasLoadedStats = useRef(Object.keys(tagStats).length > 0);

  // Daily Stability: Load or Calculate tag stats only once per day
  useEffect(() => {
    if (hasLoadedStats.current) return;
    let active = true;

    const syncStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const cached = await loadData('daily_tag_stats');
        
        // If we have a valid cache for today, use it and stop
        if (!active) return;
        if (cached && cached.date === today) {
          setTagStats(cached.stats);
          hasLoadedStats.current = true;
          return;
        }

        // If no cache or cache is old, and we have enough photos to make a meaningful calculation
        if (localPhotos.length > 20) {
          const counts: Record<string, number> = {};
          localPhotos.forEach(p => {
            if (p.tagIds && Array.isArray(p.tagIds)) {
              p.tagIds.forEach(tid => {
                const strId = String(tid);
                counts[strId] = (counts[strId] || 0) + 1;
              });
            }
          });
          
          if (!active) return;
          setTagStats(counts);
          await saveData('daily_tag_stats', { date: today, stats: counts });
          hasLoadedStats.current = true;
        }
      } catch (err) {
        globalHandleError(err, "Daily stats sync", true);
      }
    };

    syncStats();
    return () => { active = false; };
  }, [localPhotos.length]); // Only retry calculation if photo count changes significantly early on

  return useMemo(() => ({
    settings, user, isSyncing, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, isStaffMode, setIsStaffMode, activeSelectedIds,
    activeIsMultiSelect, activeToggleSelection, activeClearSelection, activeSetIsMultiSelect,
    displayPhotos, gridPhotos, categories, manufacturers, contextTags, lang, setLang, t,
    columns, setColumns, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    showWhatsAppChoice, setShowWhatsAppChoice, openWhatsApp, shareSinglePhoto, shareGroup,
    handleLoadMore, navigate, sortedTags: (() => {
      const pinnedIds = new Set((settings?.pinnedTags || []).map(id => String(id)));

      const enrichedTags = contextTags.map(t => {
        const strId = String(t.id);
        return {
          ...t,
          isPinned: t.isPinned || pinnedIds.has(strId),
          usageCount: Math.max(t.usageCount || 0, tagStats[strId] || 0)
        };
      });
      
      return sortTagsByPopularity(enrichedTags);
    })()
  }), [
    settings, user, isSyncing, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, isStaffMode, setIsStaffMode, activeSelectedIds,
    activeIsMultiSelect, activeToggleSelection, activeClearSelection, activeSetIsMultiSelect,
    displayPhotos, gridPhotos, categories, manufacturers, contextTags, lang, setLang, t,
    columns, setColumns, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    showWhatsAppChoice, setShowWhatsAppChoice, openWhatsApp, shareSinglePhoto, shareGroup,
    handleLoadMore, navigate, tagStats
  ]);
};
