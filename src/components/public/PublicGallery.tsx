import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoLightbox } from '../PhotoLightbox';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WhatsAppChoiceDialog } from '../WhatsAppChoiceDialog';
import { GroupDetailView } from '../GroupDetailView';
import { GalleryHeader } from '../PublicGallery/GalleryHeader';
import { GalleryFilters } from '../PublicGallery/GalleryFilters';
import { GalleryGrid } from '../PublicGallery/GalleryGrid';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';
import { GalleryDialogs } from '../PublicGallery/GalleryDialogs';
import { PublicFloatingButtons } from './PublicFloatingButtons';
import { getSkeletonCount } from '../../utils/skeletonHelpers';
import { useScrollRestoration, usePhotoFilters, useFeedback, useManufacturersQuery, useCategoriesQuery, useTagsQuery } from '../../hooks';
import { useGalleryStore } from '../../store';
import { translations } from '../../lib/translations';
import { useNavigate } from 'react-router-dom';
import { getPhotoDisplayName } from '../../lib/ui-helpers';
import { sortTagsByPopularity } from '../../utils/tagUtils';
import { globalHandleError } from '../../utils/errorHandler';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers?: Manufacturer[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<any>;
  settings?: AppSettings;
  isRefreshing?: boolean;
  isFetchingNextPage?: boolean;
  onRefresh?: () => void;
  user?: User | null;
  columns?: 2 | 3 | 5;
  setColumns?: (val: 2 | 3 | 5) => void;
  totalCount?: number;
  initialHash?: string;
  initialGroupId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const PublicGallery: React.FC<PublicGalleryProps> = (props) => {
  useScrollRestoration('public_gallery_scroll');
  const navigate = useNavigate();
  const { showSuccess, showError } = useFeedback();

  // State for login
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  // Store 
  const _searchQuery = useGalleryStore(s => s.searchQuery);
  const _setSearchQuery = useGalleryStore(s => s.setSearchQuery);
  const searchQuery = props.searchQuery !== undefined ? props.searchQuery : _searchQuery;
  const setSearchQuery = props.onSearchChange || _setSearchQuery;
  const selectedCatCode = useGalleryStore(s => s.filterCatId);
  const setSelectedCatCode = useGalleryStore(s => s.setFilterCatId);
  const filterSubId = useGalleryStore(s => s.filterSubId);
  const setFilterSubId = useGalleryStore(s => s.setFilterSubId);
  const selectedTagIds = useGalleryStore(s => s.filterTagIds);
  const setSelectedTagIds = useGalleryStore(s => s.setFilterTagIds);
  const sortOrder = useGalleryStore(s => s.sortOrder);
  const setSortOrder = useGalleryStore(s => s.setSortOrder);
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);
  const setShowGroupsCollapsed = useGalleryStore(s => s.setShowGroupsCollapsed);
  const langStore = useGalleryStore(s => s.appLang);
  const setLang = useGalleryStore(s => s.setAppLang);
  const columns = useGalleryStore(s => s.columns);
  const setColumns = useGalleryStore(s => s.setColumns);
  const lightboxIndex = useGalleryStore(s => s.lightboxIndex);
  const setLightboxIndex = useGalleryStore(s => s.setLightboxIndex);
  const showWhatsAppChoice = useGalleryStore(s => s.showWhatsAppChoice);
  const setShowWhatsAppChoice = useGalleryStore(s => s.setShowWhatsAppChoice);
  const activeGroupId = useGalleryStore(s => s.activeGroupId);
  const setActiveGroupId = useGalleryStore(s => s.setActiveGroupId);
  const activePhotoId = useGalleryStore(s => s.activePhotoId);
  const setActivePhotoId = useGalleryStore(s => s.setActivePhotoId);
  const isStaffMode = useGalleryStore(s => s.isStaffMode);
  const setIsStaffMode = useGalleryStore(s => s.setIsStaffMode);

  // Queries
  const { data: qManufacturers = [] } = useManufacturersQuery();
  const manufacturers = qManufacturers;
  const contextTags = props.tags || [];

  const lang = langStore || 'zh';
  const t = useMemo(() => translations[lang] || translations['zh'], [lang]);

  // Logic
  const { displayPhotos, gridPhotos } = usePhotoFilters(
    props.photos,
    props.categories,
    contextTags,
    {
      showGroupsCollapsed,
      isAdminModeOverride: false
    }
  );

  const tagMap = useMemo(() => {
    const map: Record<string, string> = {};
    contextTags.forEach(t => { map[String(t.id)] = t.name; });
    return map;
  }, [contextTags]);

  const sortedTags = useMemo(() => {
    const pinnedIds = new Set((props.settings?.pinned_tags || []).map(id => String(id)));
    const enrichedTags = contextTags.map(t => {
      const strId = String(t.id);
      return {
        ...t,
        is_pinned: t.is_pinned || pinnedIds.has(strId)
      };
    });
    return sortTagsByPopularity(enrichedTags);
  }, [contextTags, props.settings?.pinned_tags]);

  const virtuosoRef = useRef<any>(null);
  const scrollToTop = () => virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  }, [sortOrder, setSortOrder]);

  const handleLoadMore = useCallback(() => {
    if (props.onLoadMore && props.hasMore && !props.isRefreshing) props.onLoadMore();
  }, [props.onLoadMore, props.hasMore, props.isRefreshing]);

  const getShareMessage = useCallback((p: Photo) => {
    const displayName = getPhotoDisplayName(p, props.categories, lang, t);
    const suffix = isStaffMode ? (p.manual_code ? ` [${p.manual_code}]` : '') : (p.model_number ? ` (${p.model_number})` : '');
    const shareUrl = `${window.location.origin}/h/${p.image_hash}`;

    if (lang === 'ms') return `Halo, saya berminat dengan perabot ini:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    if (lang === 'en') return `Hello, I'm interested in this furniture:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    return `你好，我对这个家具有兴趣：\n\n${displayName}${suffix}\n\n链接: ${shareUrl}`;
  }, [props.categories, lang, t, isStaffMode]);

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
  }, [t.shareTitle, getShareMessage, showSuccess, showError]);

  const shareGroup = useCallback((photos: Photo[]) => {
    const validPhotos = photos.filter(p => !!p);
    const gId = validPhotos[0]?.group_id || activeGroupId;
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
  }, [t, activeGroupId, showSuccess, showError]);

  const handleContactWhatsApp = (photo: Photo) => {
    if (props.settings?.whatsapp_1 && !props.settings?.whatsapp_2) {
      openWhatsApp(props.settings.whatsapp_1, photo);
    } else {
      setShowWhatsAppChoice(true);
    }
  };

  const virtuosoComponents = useMemo(() => ({
    Footer: () => {
      if (props.isFetchingNextPage) {
        return (
          <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
            <div className="w-5 h-5 border-[2px] border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <span className="text-[10px] text-slate-500 font-medium tracking-tight animate-pulse">
              {t.loading || '正在载入更多...'}
            </span>
          </div>
        );
      }
      return (
        <div className="py-12 mt-12 flex flex-col items-center justify-center opacity-30 select-none pb-32">
          {props.settings?.logo_url && <img src={props.settings.logo_url} className="w-6 h-6 object-cover rounded-xl mb-3 grayscale" alt="Logo" />}
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy">
            {props.settings?.app_name || 'PhotoX Gallery'}
          </span>
        </div>
      );
    }
  }), [props.settings?.logo_url, props.settings?.app_name, props.isFetchingNextPage, t.loading]);

  const isSyncing = !!props.isRefreshing;

  const virtuosoContext = useMemo(() => ({
    hasMore: props.hasMore,
    isSyncing,
    isFetchingNextPage: props.isFetchingNextPage,
    safePhotosLength: gridPhotos.length,
    textLoadMore: t.loadMore,
    textEndOfList: t.endOfList,
    textLoading: t.loading
  }), [props.hasMore, isSyncing, props.isFetchingNextPage, gridPhotos.length, t]);

  // Hash link handling
  useEffect(() => {
    if (props.initialHash && lightboxIndex === null && displayPhotos.length > 0) {
      const idx = displayPhotos.findIndex(p => p.image_hash === props.initialHash);
      if (idx !== -1) setLightboxIndex(idx);
    }
  }, [props.initialHash, lightboxIndex, displayPhotos, setLightboxIndex]);

  useEffect(() => {
    if (props.initialGroupId && activeGroupId === null && props.photos.length > 0) {
      const groupExists = props.photos.some(p => p.group_id === props.initialGroupId);
      if (groupExists) setActiveGroupId(props.initialGroupId);
    }
  }, [props.initialGroupId, activeGroupId, props.photos, setActiveGroupId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text"
    >
      {lightboxIndex === null && (
        <GalleryHeader 
          totalCount={props.totalCount}
          settings={props.settings}
          photos={props.photos}
          isRefreshing={isSyncing}
          isMultiSelect={false}
          lang={lang}
          t={t}
          onRefresh={props.onRefresh}
          onSetLang={setLang}
          onExit={props.onExit}
          onLogin={() => setShowPassPrompt(true)}
        />
      )}

      <GalleryFilters 
        settings={props.settings}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
        columns={columns}
        setColumns={setColumns}
        showGroupsCollapsed={showGroupsCollapsed}
        setShowGroupsCollapsed={setShowGroupsCollapsed}
        categories={props.categories}
        selectedCatCode={selectedCatCode}
        setSelectedCatCode={setSelectedCatCode}
        filterSubId={filterSubId}
        setFilterSubId={setFilterSubId}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        sortedTags={sortedTags}
        lang={lang}
        t={t}
        onScrollToTop={scrollToTop}
      />

      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        <AnimatePresence>
          {(() => {
            const isInitialLoad = isSyncing && gridPhotos.length === 0;
            if (isInitialLoad) {
              const skeletonCount = getSkeletonCount(props.totalCount, columns);
              return (
                <motion.div 
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-10 bg-brand-bg"
                >
                  <GallerySkeleton columns={columns} count={skeletonCount} />
                </motion.div>
              );
            }
            if (gridPhotos.length === 0 && !props.isFetchingNextPage) {
              return (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <GalleryEmpty t={t} />
                </motion.div>
              );
            }
            return (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <ErrorBoundary>
                  <GalleryGrid 
                    virtuosoRef={virtuosoRef}
                    gridPhotos={gridPhotos}
                    displayPhotos={displayPhotos}
                    columns={columns}
                    virtuosoComponents={virtuosoComponents}
                    virtuosoContext={virtuosoContext}
                    handleLoadMore={handleLoadMore}
                    isAdminMode={false}
                    showGroupsCollapsed={showGroupsCollapsed}
                    lang={lang}
                    t={t}
                    categories={props.categories}
                    manufacturers={manufacturers}
                    tagMap={tagMap}
                    setActiveGroupId={setActiveGroupId}
                    setActivePhotoId={setActivePhotoId}
                    setLightboxIndex={setLightboxIndex}
                    shareSinglePhoto={shareSinglePhoto}
                    selectedCatCode={selectedCatCode}
                    filterSubId={filterSubId}
                    selectedTagIds={selectedTagIds}
                    searchQuery={searchQuery}
                  />
                </ErrorBoundary>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {lightboxIndex === null && (
        <PublicFloatingButtons scrollToTop={scrollToTop} setShowWhatsAppChoice={setShowWhatsAppChoice} />
      )}


      <GroupDetailView 
        activeGroupId={activeGroupId}
        setActiveGroupId={(gid) => {
          setActiveGroupId(gid);
          if (gid === null) setActivePhotoId(null);
        }}
        initialPhotoId={activePhotoId}
        photos={props.photos}
        displayPhotos={displayPhotos}
        setLightboxIndex={setLightboxIndex}
        isStaffMode={false}
        lang={lang}
        t={t}
        categories={props.categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        allTags={contextTags}
        shareGroup={shareGroup}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
      />

      <GalleryDialogs 
        showPassPrompt={showPassPrompt}
        setShowPassPrompt={setShowPassPrompt}
        passInput={passInput}
        setPassInput={setPassInput}
        passError={passError}
        setPassError={setPassError}
        t={t}
        loginWithGoogle={props.loginWithGoogle}
        settings={props.settings}
        setIsStaffMode={setIsStaffMode}
        navigate={navigate}
        showWhatsAppChoice={showWhatsAppChoice}
        setShowWhatsAppChoice={setShowWhatsAppChoice}
        openWhatsApp={openWhatsApp}
      />

      <AnimatePresence>
        {lightboxIndex !== null && displayPhotos[lightboxIndex] && (
            <PhotoLightbox 
              photo={displayPhotos[lightboxIndex]}
              displayPhotos={displayPhotos}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onPrev={() => setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : (displayPhotos?.length || 0) - 1)}
              onNext={() => setLightboxIndex(lightboxIndex < (displayPhotos?.length || 0) - 1 ? lightboxIndex + 1 : 0)}
              isStaffMode={false}
              contactWhatsApp={handleContactWhatsApp}
              lang={lang}
              t={t}
              tagMap={tagMap}
              categories={props.categories}
              manufacturers={manufacturers || []}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
