import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { useGalleryStore } from '../../store';
import { useCategoriesQuery, useTagsQuery, useManufacturersQuery } from '../../hooks';
import { translations, LanguageCode } from '../../lib/translations';
import { filterPhotos, groupPhotos } from '../../lib/filters';
import { isValidPhoto } from '../../lib/typeGuard';
import { toast } from 'sonner';
import { getPhotoDisplayName } from '../../lib/ui-helpers';

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
    isAdminMode,
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
    setAppLang: setLang
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

  const { displayPhotos, gridPhotos } = useMemo(() => {
    const validPhotos = (incomingPhotos && incomingPhotos.length > 0 ? incomingPhotos : localPhotos).filter(isValidPhoto);
    
    const tagMap = new Map<string, string[]>();
    contextTags.forEach(t => {
      const terms = [t.name.toLowerCase()];
      if (Array.isArray(t.aliases)) {
        t.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      tagMap.set(String(t.id), terms);
    });
    
    const catMap = new Map<string, string[]>();
    categories.forEach(c => {
      const terms = [(c.zh || c.name || '').toLowerCase()];
      if (Array.isArray(c.aliases)) {
        c.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      catMap.set(String(c.id), terms);
    });

    const dp = filterPhotos(validPhotos, {
      searchQuery,
      filterCatId: selectedCatCode,
      filterSubId: selectedSubId,
      filterTagIds: selectedTagIds,
      sortOrder,
      isAdminMode,
      isStaffMode
    }, contextTags, categories, tagMap, catMap);

    const gp = groupPhotos(dp, showGroupsCollapsed, sortOrder);
    return { displayPhotos: dp, gridPhotos: gp };
  }, [incomingPhotos, localPhotos, sortOrder, isAdminMode, isStaffMode, contextTags, categories, showGroupsCollapsed]);

  const lang = (langStore || 'en') as LanguageCode;
  const t = useMemo(() => translations[lang] || translations['en'], [lang]);

  const [internalColumns, setInternalColumns] = useState<2 | 3 | 5>(3);
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

  useEffect(() => {
    scrollToTop();
  }, [selectedCatCode, selectedSubId, selectedTagIds]);

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

  const shareSinglePhoto = useCallback(async (photo: Photo) => {
    const msg = getShareMessage(photo);
    try {
      if (navigator.share) await navigator.share({ title: t.shareTitle, text: msg });
      else {
        await navigator.clipboard.writeText(msg);
        toast.success("分享信息已复制到剪贴板！/ Share info copied to clipboard!");
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }, [t.shareTitle, getShareMessage]);

  const shareGroup = useCallback(async (photos: Photo[]) => {
    const validPhotos = photos.filter(p => !!p);
    const gId = validPhotos[0]?.groupId || activeGroupId;
    const shareUrl = `${window.location.origin}/g/${gId}`;
    const msg = validPhotos.map(p => p.name || 'Furniture').slice(0, 3).join(', ') + (validPhotos.length > 3 ? '...' : '');
    const shareText = `${t.sharePrompt}\n\n${t.shareTitle}: ${msg}\n\nView full collection: ${shareUrl}`;
    try {
      if (navigator.share) await navigator.share({ title: t.shareTitle, text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        toast.success("群组分享链接已复制！/ Group share link copied!");
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error("Group share failed:", e);
    }
  }, [t, activeGroupId]);

  const handleLoadMore = useCallback(() => {
    if (onLoadMore && hasMore && !isSyncing) onLoadMore();
  }, [onLoadMore, hasMore, isSyncing]);

  return {
    settings, user, isSyncing, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, isStaffMode, setIsStaffMode, activeSelectedIds,
    activeIsMultiSelect, activeToggleSelection, activeClearSelection, activeSetIsMultiSelect,
    displayPhotos, gridPhotos, categories, manufacturers, contextTags, lang, setLang, t,
    columns, setColumns, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    showWhatsAppChoice, setShowWhatsAppChoice, openWhatsApp, shareSinglePhoto, shareGroup,
    handleLoadMore, navigate, sortedTags: useMemo(() => [...contextTags].sort((a,b) => a.name.localeCompare(b.name)), [contextTags])
  };
};
