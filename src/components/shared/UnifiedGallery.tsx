import React, { useMemo, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { PhotoLightbox } from '../PhotoLightbox';
import { usePhotoActions } from '@/features/admin/useAdmin';
import { flattenPhotoInfiniteQueryPages, normalizeAdminPhotos } from '@/lib/selectors/photos';
import { GalleryFilters } from '../ui/GalleryFilters';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { GroupDetailView } from '../GroupDetailView';
import { GalleryDialogs } from './GalleryDialogs';
import { useScrollRestoration, useFilters, usePhotoFilters, useAdminMode, useTasks, useInfinitePhotos, useFeedback, useCategoriesQuery, useTagsQuery, useSettings, usePhotoCount, useMultiSelect, usePermission } from '../../hooks';
import { useGalleryStore, useShallow } from '../../store';
import { PAGINATION } from '../../constants/config';
import { translations } from '../../lib/translations';
import { useAdmin } from '@/features/admin/useAdmin';
import { FloatingActions } from './FloatingActions';
import { Photo } from '../../types';
import { useNavigate } from '@tanstack/react-router';
import { GalleryVariant } from '@/types/variant';

interface UnifiedGalleryProps {
  variant: GalleryVariant;
  // Public logic props (only used if variant === 'public-showcase')
  onExit?: () => void;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<any>;
  // Admin logic props (only used if variant === 'full-management' or 'staff-workspace')
  handleBatchAiIdentifyTrigger?: () => void;
  batchProgress?: any;
}

/** 
 * @remarks
 * 臨時降級開關，待 fd 根因修復後設為 false
 */
const ADMIN_GALLERY_DISABLED = false;

const gallerySelector = (s: any) => ({
    appLang: s.appLang,
    columns: s.columns,
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    sortOrder: s.sortOrder,
    setSortOrder: s.setSortOrder,
    filterCatId: s.filterCatId,
    filterTagIds: s.filterTagIds,
    debouncedSearchQuery: s.debouncedSearchQuery,
    isStaffMode: s.isStaffMode,
    setIsStaffMode: s.setIsStaffMode,
    viewMode: s.viewMode,
    showPassPrompt: s.showPassPrompt,
    setShowPassPrompt: s.setShowPassPrompt
  });

export const UnifiedGallery: React.FC<UnifiedGalleryProps> = React.memo(({
  variant,
  onExit,
  onLogin,
  loginWithGoogle,
  handleBatchAiIdentifyTrigger,
  batchProgress
}) => {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  
  // Agent v3.0 Force Isolation
  if (ADMIN_GALLERY_DISABLED && isManagement) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>管理畫廊臨時維護中 / Admin Gallery Maintenance</div>;
  }

  const scrollKey = isManagement ? 'admin_gallery_scroll' : 'public_gallery_scroll';
  useScrollRestoration(scrollKey);
  
  const { showSuccess, showError } = useFeedback();
  const { can } = usePermission();
  const isAdminMode = useAdminMode() || isManagement;
  const { tasks } = useTasks();
  const { isMultiSelect, selectedIds, disable } = useMultiSelect();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store
  const store = useGalleryStore(useShallow(gallerySelector));

  // Core Data fetchers (handled differently per variant or shared)
  const adminData = isManagement ? useAdmin() : null;
  const publicData = variant === 'public-showcase' ? {
    categories: useCategoriesQuery().data || [],
    tags: useTagsQuery().data || [],
    settings: useSettings().settings
  } : null;

  const categories = adminData?.categories || publicData?.categories || [];
  const tags = adminData?.tags || publicData?.tags || [];
  const settings = adminData?.settings || publicData?.settings;
  const photosFromAdmin = useMemo(() => normalizeAdminPhotos(adminData?.photos || []), [adminData?.photos]);

  const pageSize = isManagement ? PAGINATION.ADMIN_BATCH_SIZE : PAGINATION.PUBLIC_PAGE_SIZE;
  
  const infiniteQuery = useInfinitePhotos({
    category_id: store.filterCatId,
    tag_id: Array.isArray(store.filterTagIds) && store.filterTagIds.length > 0 ? store.filterTagIds[0] : null,
    searchQuery: store.debouncedSearchQuery,
    sortOrder: store.sortOrder,
    isAdminMode: isManagement
  }, pageSize, !isManagement);

  const photos = useMemo(() => {
    if (isManagement && adminData) return photosFromAdmin;
    return flattenPhotoInfiniteQueryPages(infiniteQuery.data?.pages || []);
  }, [isManagement, adminData, photosFromAdmin, infiniteQuery.data]);

  const { filters } = useFilters();
  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
    tags,
    {
      showGroupsCollapsed: filters.showGroupsCollapsed,
      isAdminModeOverride: isManagement
    }
  );

  const lang = store.appLang || 'zh';
  const t = React.useMemo(() => translations[lang as keyof typeof translations] || translations.en, [lang]);

  const virtuosoRef = useRef<any>(null);
  const scrollToTop = () => virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });

  const { onEditPhoto, onToggleHidden, onTogglePinned, onAiAnalyze, onSetGroupCover, onCancelAnalyze } = usePhotoActions();

  const isAnalyzing = useMemo(() => {
    if (isManagement) {
      return tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析')));
    }
    return false;
  }, [isManagement, tasks]);

  const { isStaffMode, setIsStaffMode, showPassPrompt, setShowPassPrompt } = store;

  const navigate = useNavigate();

  // State for login/WhatsApp logic (Public mode)
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);
  const [showWhatsAppChoice, setShowWhatsAppChoice] = useState(false);

  const getShareMessage = useCallback((p: Photo) => {
    const displayName = p.name || 'Furniture';
    const suffix = isStaffMode ? (p.manual_code ? ` [${p.manual_code}]` : '') : (p.model_number ? ` (${p.model_number})` : '');
    const shareUrl = `${window.location.origin}/h/${p.image_hash}`;

    if (lang === 'ms') return `Halo, saya berminat dengan perabot ini:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    if (lang === 'en') return `Hello, I'm interested in this furniture:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    return `你好，我对这个家具有兴趣：\n\n${displayName}${suffix}\n\n链接: ${shareUrl}`;
  }, [lang, isStaffMode]);

  const openWhatsApp = useCallback((num: string, photo?: Photo) => {
    if (!num) return;
    let msg = photo ? getShareMessage(photo) : (lang === 'ms' ? `Halo, saya ingin bertanya tentang maklumat perabot.` : lang === 'en' ? `Hello, I'd like to inquire about furniture information.` : `你好，我想咨询家具信息。`);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsAppChoice(false);
  }, [lang, getShareMessage]);

  const handleWhatsAppContact = useCallback((photo: Photo) => {
    if (variant === 'public-showcase') {
      if (settings?.whatsapp_1 && !settings?.whatsapp_2) {
        openWhatsApp(settings.whatsapp_1, photo);
      } else if (settings?.whatsapp_1 || settings?.whatsapp_2) {
        setShowWhatsAppChoice(true);
      }
    }
  }, [variant, settings, openWhatsApp]);

  const shareGroup = useCallback((photos: Photo[]) => {
    const validPhotos = photos.filter(p => !!p);
    if (validPhotos.length === 0) return;
    const gId = validPhotos[0]?.group_id || store.activeGroupId;
    const shareUrl = `${window.location.origin}/g/${gId}`;
    const msg = validPhotos.map(p => p.name || 'Furniture').slice(0, 3).join(', ') + (validPhotos.length > 3 ? '...' : '');
    const shareText = `${t.sharePrompt || 'Check out this collection'}\n\n${t.shareTitle || 'Collection'}: ${msg}\n\nView full collection: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({ title: t.shareTitle, text: shareText }).catch(e => { if (e.name !== 'AbortError') console.error("Group share", e); });
    } else {
      navigator.clipboard.writeText(shareText)
        .then(() => showSuccess("群组分享链接已复制！/ Group share link copied!"))
        .catch(e => showError(e, '复制群组链接失败'));
    }
  }, [t, store.activeGroupId, showSuccess, showError]);

  return (
    <LayoutGroup id="gallery-v2.8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text"
      >
        <GalleryFilters 
          onScrollToTop={scrollToTop}
          variant={variant}
          onBatchAiIdentify={handleBatchAiIdentifyTrigger}
          isAnalyzing={isAnalyzing}
          batchProgress={batchProgress}
        />

        <div className="flex-1 overflow-hidden bg-brand-bg relative">
          <AnimatePresence>
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <PhotoBoard virtuosoRef={virtuosoRef} variant={variant} />
            </motion.div>
          </AnimatePresence>
        </div>

        {variant === 'public-showcase' && store.lightboxIndex === null && (
          <FloatingActions 
            variant={variant} 
            scrollToTop={scrollToTop} 
            contactWhatsApp={() => handleWhatsAppContact(undefined as any)} 
          />
        )}

        {isManagement && (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => adminData?.handlePhotoImport(e, true, store.activeGroupId)} 
            />
            <FloatingActions 
              variant={variant}
              onAdd={() => fileInputRef.current?.click()}
              onBatchAiIdentify={() => {
                const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
                adminData?.handleBatchAiIdentifyTrigger(selectedPhotos);
              }}
              onBatchEdit={() => adminData?.handleBatchEdit(selectedIds)}
              onGroup={() => adminData?.handleGroupPhotos(selectedIds)}
              onDelete={() => adminData?.handleDeletePhotos(selectedIds)}
              onToggleVisibility={() => adminData?.handleBatchToggleHidden(selectedIds)}
              onClearSelection={disable}
            />
          </>
        )}

        <AnimatePresence>
          {store.lightboxIndex !== null && displayPhotos[store.lightboxIndex] && (
              <PhotoLightbox 
                photo={displayPhotos[store.lightboxIndex]}
                displayPhotos={displayPhotos}
                index={store.lightboxIndex}
                onClose={() => store.setLightboxIndex(null)}
                onPrev={() => store.setLightboxIndex(store.lightboxIndex! > 0 ? store.lightboxIndex! - 1 : (displayPhotos?.length || 0) - 1)}
                onNext={() => store.setLightboxIndex(store.lightboxIndex! < (displayPhotos?.length || 0) - 1 ? store.lightboxIndex! + 1 : 0)}
                contactWhatsApp={variant === 'public-showcase' ? handleWhatsAppContact : undefined}
                onEditPhoto={isManagement ? onEditPhoto : undefined}
                onToggleHidden={isManagement ? onToggleHidden : undefined}
                onTogglePinned={isManagement ? onTogglePinned : undefined}
                onAiAnalyze={isManagement ? (onAiAnalyze as any) : undefined}
                onSetGroupCover={isManagement ? (onSetGroupCover as any) : undefined}
                onCancelAnalyze={isManagement ? onCancelAnalyze : undefined}
                isAnalyzing={isAnalyzing}
              />
          )}
        </AnimatePresence>

        <GroupDetailView 
          activeGroupId={store.activeGroupId}
          setActiveGroupId={(gid) => {
            store.setActiveGroupId(gid);
            if (gid === null) store.setActivePhotoId(null);
          }}
          initialPhotoId={store.activePhotoId}
          displayPhotos={displayPhotos}
          setLightboxIndex={store.setLightboxIndex}
          isStaffMode={store.isStaffMode}
          shareGroup={shareGroup}
          contactWhatsApp={handleWhatsAppContact}
          variant={variant}
        />

        {variant === 'public-showcase' && (
          <GalleryDialogs 
            showPassPrompt={showPassPrompt}
            setShowPassPrompt={setShowPassPrompt}
            passInput={passInput}
            setPassInput={setPassInput}
            passError={passError}
            setPassError={setPassError}
            t={t}
            loginWithGoogle={loginWithGoogle}
            setIsStaffMode={setIsStaffMode}
            navigate={navigate}
            showWhatsAppChoice={showWhatsAppChoice}
            setShowWhatsAppChoice={setShowWhatsAppChoice}
            openWhatsApp={openWhatsApp}
            settings={settings}
          />
        )}
      </motion.div>
    </LayoutGroup>
  );
});
