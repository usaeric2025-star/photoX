import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoLightbox } from '../PhotoLightbox';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WhatsAppChoiceDialog } from '../WhatsAppChoiceDialog';
import { GroupDetailView } from '../GroupDetailView';
import { GalleryHeader } from '../PublicGallery/GalleryHeader';
import { GalleryFilters } from '../ui/GalleryFilters';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';
import { GalleryDialogs } from '../PublicGallery/GalleryDialogs';
import { PublicFloatingButtons } from './PublicFloatingButtons';
import { getSkeletonCount } from '../../utils/skeletonHelpers';
import { useScrollRestoration, usePhotoFilters, useFeedback, useManufacturersQuery, useCategoriesQuery, useTagsQuery, useSettings } from '../../hooks';
import { useGalleryStore, useShallow } from '../../store';
import { translations } from '../../lib/translations';
import { useNavigate } from 'react-router-dom';
import { getPhotoDisplayName } from '../../lib/ui-helpers';
import { sortTagsByPopularity } from '../../utils/tagUtils';
import { globalHandleError } from '../../utils/errorHandler';

interface PublicGalleryProps {
  photos: Photo[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<any>;
  isRefreshing?: boolean;
  isFetchingNextPage?: boolean;
  onRefresh?: () => void;
  user?: User | null;
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

  // Queries
  const { data: categories = [] } = useCategoriesQuery();
  const { data: contextTags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();
  const { settings } = useSettings();

  // State for login
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  // Store 
  const { 
    searchQuery: _searchQuery, setSearchQuery: _setSearchQuery,
    showGroupsCollapsed, appLang: langStore,
    lightboxIndex, setLightboxIndex,
    showWhatsAppChoice, setShowWhatsAppChoice,
    activeGroupId, setActiveGroupId,
    activePhotoId, setActivePhotoId,
    isStaffMode, setIsStaffMode,
    sortOrder, setSortOrder, setTagIdToNameMap
  } = useGalleryStore(useShallow(s => ({
    searchQuery: s.searchQuery,
    setSearchQuery: s.setSearchQuery,
    showGroupsCollapsed: s.showGroupsCollapsed,
    appLang: s.appLang,
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    showWhatsAppChoice: s.showWhatsAppChoice,
    setShowWhatsAppChoice: s.setShowWhatsAppChoice,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    isStaffMode: s.isStaffMode,
    setIsStaffMode: s.setIsStaffMode,
    sortOrder: s.sortOrder,
    setSortOrder: s.setSortOrder,
    setTagIdToNameMap: s.setTagIdToNameMap
  })));

  useEffect(() => {
    if (contextTags && contextTags.length > 0) {
      const map: Record<string, string> = { };
      contextTags.forEach(t => { map[String(t.id)] = t.name; });
      setTagIdToNameMap(map);
    }
  }, [contextTags, setTagIdToNameMap]);

  const searchQuery = props.searchQuery !== undefined ? props.searchQuery : _searchQuery;
  const setSearchQuery = props.onSearchChange || _setSearchQuery;
  
  const lang = langStore || 'zh';
  const t = useMemo(() => translations[lang] || translations['zh'], [lang]);

  // Logic
  const { displayPhotos, gridPhotos } = usePhotoFilters(
    props.photos,
    categories,
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

  const virtuosoRef = useRef<any>(null);
  const scrollToTop = () => virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  }, [sortOrder, setSortOrder]);

  const handleLoadMore = useCallback(() => {
    if (props.onLoadMore && props.hasMore && !props.isRefreshing) props.onLoadMore();
  }, [props.onLoadMore, props.hasMore, props.isRefreshing]);

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
    if (settings?.whatsapp_1 && !settings?.whatsapp_2) {
      openWhatsApp(settings.whatsapp_1, photo);
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
          {settings?.logo_url && <img src={settings.logo_url} className="w-6 h-6 object-cover rounded-xl mb-3 grayscale" alt="Logo" />}
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy">
            {settings?.app_name || 'PhotoX Gallery'}
          </span>
        </div>
      );
    }
  }), [settings?.logo_url, settings?.app_name, props.isFetchingNextPage, t.loading]);

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
          photos={props.photos}
          isRefreshing={isSyncing}
          isMultiSelect={false}
          onRefresh={props.onRefresh}
          onExit={props.onExit}
          onLogin={() => setShowPassPrompt(true)}
        />
      )}

      <GalleryFilters 
        onScrollToTop={scrollToTop}
        variant="public"
      />

      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        <AnimatePresence>
          {(() => {
            const isInitialLoad = isSyncing && gridPhotos.length === 0;
            return (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <ErrorBoundary>
                  <PhotoBoard
                    virtuosoRef={virtuosoRef}
                    gridPhotos={gridPhotos}
                    displayPhotos={displayPhotos}
                    virtuosoComponents={virtuosoComponents}
                    virtuosoContext={virtuosoContext}
                    handleLoadMore={handleLoadMore}
                    isInitialLoad={isInitialLoad}
                    totalCount={props.totalCount}
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
        isStaffMode={isStaffMode}
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
              contactWhatsApp={handleContactWhatsApp}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
