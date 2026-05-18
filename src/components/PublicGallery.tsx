import React, { useState, useMemo, useCallback } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../types';
import { ArrowUpToLine, MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { PhotoLightbox } from './PhotoLightbox';
import { StaffUnlockDialog } from './StaffUnlockDialog';
import { WhatsAppChoiceDialog } from './WhatsAppChoiceDialog';
import { GroupDetailView } from './GroupDetailView';
import { usePublicGalleryLogic } from './PublicGallery/usePublicGalleryLogic';
import { GalleryHeader } from './PublicGallery/GalleryHeader';
import { GalleryFilters } from './PublicGallery/GalleryFilters';
import { GalleryGrid } from './PublicGallery/GalleryGrid';
import { GallerySkeleton } from './PublicGallery/GallerySkeleton';
import { GalleryEmpty } from './PublicGallery/GalleryEmpty';
import { GalleryDialogs } from './PublicGallery/GalleryDialogs';
import { GalleryFloatButtons } from './PublicGallery/GalleryFloatButtons';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers?: Manufacturer[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<any>;
  internalPassword?: string;
  settings?: AppSettings;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  user?: User | null;
  isAdminMode?: boolean;
  isStaffMode?: boolean;
  onEditPhoto?: (id: string) => void;
  onDeletePhotos?: (ids: string[]) => void;
  onGroupPhotos?: (ids: string[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onGroupClick?: (groupId: string) => void;
  onOpenSettings?: () => void;
  onAddPhoto?: () => void;
  selectedIds?: string[];
  onToggleSelection?: (id: string) => void;
  onClearSelection?: () => void;
  isMultiSelect?: boolean;
  onToggleMultiSelect?: () => void;
  columns?: 2 | 3 | 5;
  setColumns?: (val: 2 | 3 | 5) => void;
  cloudCount?: number | null;
  hideHeader?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  onSetGroupCover?: (id: string, groupId: string) => Promise<void>;
  setAlertDialog?: (d: { title: string, message: string }) => void;
  totalCount?: number;
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  initialHash?: string;
  initialGroupId?: string;
}

const VirtuosoGridFooter = React.memo(({ context }: any) => {
  const { hasMore, isSyncing, safePhotosLength, textEndOfList, textLoading } = context || {};
  if (isSyncing) return (
    <div className="py-8 flex flex-col items-center justify-center w-full min-h-[100px]">
      <div className="flex items-center gap-3 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-brand-navy/10">
        <div className="w-4 h-4 border-2 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/60">{textLoading}...</span>
      </div>
    </div>
  );
  if (!hasMore && safePhotosLength > 0) return (
    <div className="py-12 pb-16 flex flex-col items-center justify-center w-full clear-both border-t border-brand-navy/5 bg-brand-navy/[0.02]">
      <div className="flex flex-col items-center gap-2 opacity-20">
        <div className="h-[1px] w-12 bg-brand-navy" />
        <p className="text-[8px] font-black uppercase tracking-[0.2em]">{textEndOfList}</p>
      </div>
    </div>
  );
  return <div className="h-40" />;
});
VirtuosoGridFooter.displayName = 'VirtuosoGridFooter';

const virtuosoComponents = { Footer: VirtuosoGridFooter };

export const PublicGallery: React.FC<PublicGalleryProps> = (props) => {
  const logic = usePublicGalleryLogic(props);
  const {
    settings, user, isSyncing, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, isStaffMode, setIsStaffMode, activeSelectedIds,
    activeIsMultiSelect, activeToggleSelection, activeClearSelection, activeSetIsMultiSelect,
    displayPhotos, gridPhotos, categories, manufacturers, contextTags, lang, setLang, t,
    columns, setColumns, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    showWhatsAppChoice, setShowWhatsAppChoice, openWhatsApp, shareSinglePhoto, shareGroup,
    handleLoadMore, navigate, sortedTags
  } = logic;

  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const handleLoginClick = () => {
    if (!props.isAdminMode && !user && !isStaffMode) setShowPassPrompt(true);
    else if (props.onExit) props.onExit();
    else navigate('/admin');
  };

  const virtuosoContext = useMemo(() => ({
    hasMore: props.hasMore,
    isSyncing,
    safePhotosLength: gridPhotos.length,
    textLoadMore: t.loadMore,
    textEndOfList: t.endOfList,
    textLoading: t.loading
  }), [props.hasMore, isSyncing, gridPhotos.length, t]);

  const startLongPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (id: string) => {
    // Basic implementation, simplified for refactor
    if (props.isAdminMode) {
      startLongPressTimer.current = setTimeout(() => {
        activeSetIsMultiSelect(true);
        activeToggleSelection(id);
      }, 400); // 400ms delay for long press
    }
  };

  const endLongPress = () => {
    if (startLongPressTimer.current) {
        clearTimeout(startLongPressTimer.current);
        startLongPressTimer.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg w-full overflow-hidden text-text">
      {lightboxIndex === null && !props.hideHeader && (
        <GalleryHeader 
          totalCount={props.totalCount}
          settings={settings}
          photos={props.photos}
          isAdminMode={!!props.isAdminMode}
          isRefreshing={!!isSyncing}
          isMultiSelect={!!activeIsMultiSelect}
          lang={lang}
          t={t}
          onRefresh={props.onRefresh}
          onToggleMultiSelect={() => activeSetIsMultiSelect(!activeIsMultiSelect)}
          clearSelection={activeClearSelection}
          setIsMultiSelect={activeSetIsMultiSelect}
          onAddPhoto={props.onAddPhoto}
          onSetLang={setLang}
          onExit={handleLoginClick}
          onLogin={props.onLogin}
          onOpenSettings={props.onOpenSettings}
        />
      )}

      <GalleryFilters 
        settings={settings}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
        columns={columns}
        setColumns={setColumns}
        showGroupsCollapsed={showGroupsCollapsed}
        setShowGroupsCollapsed={setShowGroupsCollapsed}
        categories={categories}
        selectedCatCode={selectedCatCode}
        setSelectedCatCode={setSelectedCatCode}
        selectedSubId={selectedSubId}
        setSelectedSubId={setSelectedSubId}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        sortedTags={sortedTags}
        lang={lang}
        t={t}
        onScrollToTop={scrollToTop}
        isAdminMode={!!props.isAdminMode}
      />

      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        {isSyncing && gridPhotos.length === 0 ? (
          <GallerySkeleton columns={columns} />
        ) : gridPhotos.length === 0 ? (
          <GalleryEmpty t={t} />
        ) : (
          <GalleryGrid 
            virtuosoRef={virtuosoRef}
            gridPhotos={gridPhotos}
            displayPhotos={displayPhotos}
            columns={columns}
            virtuosoComponents={virtuosoComponents}
            virtuosoContext={virtuosoContext}
            handleLoadMore={handleLoadMore}
            isAdminMode={!!props.isAdminMode}
            activeIsMultiSelect={activeIsMultiSelect}
            isStaffMode={isStaffMode}
            activeSelectedIds={activeSelectedIds}
            showGroupsCollapsed={showGroupsCollapsed}
            lang={lang}
            t={t}
            categories={categories}
            manufacturers={manufacturers}
            tagMap={tagMap}
            activeToggleSelection={activeToggleSelection}
            onEditPhoto={props.onEditPhoto}
            setActiveGroupId={setActiveGroupId}
            setActivePhotoId={setActivePhotoId}
            setLightboxIndex={setLightboxIndex}
            startLongPress={startLongPress}
            endLongPress={endLongPress}
            shareSinglePhoto={shareSinglePhoto}
            onTogglePinned={props.onTogglePinned}
            selectedCatCode={selectedCatCode}
            selectedSubId={selectedSubId}
            selectedTagIds={selectedTagIds}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {lightboxIndex === null && !props.isAdminMode && (
        <GalleryFloatButtons scrollToTop={scrollToTop} setShowWhatsAppChoice={setShowWhatsAppChoice} />
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
        isAdminMode={!!props.isAdminMode}
        isStaffMode={isStaffMode}
        onEditPhoto={props.onEditPhoto ? (photo) => props.onEditPhoto!(photo.id) : undefined}
        onLongPressStart={props.isAdminMode ? (p) => startLongPress(p.id) : undefined}
        onLongPressEnd={() => {}}
        onBatchEdit={props.onBatchEdit}
        onUngroup={props.onGroupPhotos && activeGroupId ? () => props.onGroupPhotos!([activeGroupId]) : undefined} 
        onAddPhotoToGroup={props.onAddPhoto}
        onAiAnalyze={props.onAiAnalyze}
        onCancelAnalyze={props.onCancelAnalyze}
        isAnalyzing={props.isAnalyzing}
        onBatchAiAnalyze={props.onBatchAiAnalyze}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        allTags={contextTags}
        isMultiSelect={activeIsMultiSelect}
        setAlertDialog={props.setAlertDialog}
        shareGroup={shareGroup}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        onToggleHidden={props.onToggleHidden}
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
        settings={settings}
        setIsStaffMode={setIsStaffMode}
        navigate={navigate}
        showWhatsAppChoice={showWhatsAppChoice}
        setShowWhatsAppChoice={setShowWhatsAppChoice}
        openWhatsApp={openWhatsApp}
      />
    </div>
  );
};
