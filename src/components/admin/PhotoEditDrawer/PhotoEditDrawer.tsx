import React from 'react';
import { motion } from 'motion/react';
import { Photo, ProductFormData } from '../../../types';
import { usePhotoEditLogic } from './usePhotoEditLogic';
import { DrawerHeader } from './DrawerHeader';
import { useGalleryStore, useShallow } from '../../../store';
import { BasicInfoTab } from './BasicInfoTab';
import { OrgTab } from './OrgTab';
import { DetailsTab } from './DetailsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { getCacheBustedImageUrl } from '../../../lib/ui-helpers';
import { translations } from '../../../lib/translations';

import { 
  useInfinitePhotos, useCategoriesQuery, useTagsQuery, useManufacturersQuery 
} from '../../../hooks';
import { cleanPhotos } from '../../../lib/filters';
import { PAGINATION } from '../../../constants/config';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';

export const PhotoEditDrawer: React.FC = () => {
  const { 
    editPhotoId, formState, updateForm, newPhotoData, setNewPhotoData, 
    appLang, filterCatId, filterTagIds, debouncedSearchQuery, sortOrder,
    abortAnalysis, setBatchEditingIds, setEditPhotoId
  } = useGalleryStore(useShallow(s => ({
    editPhotoId: s.editPhotoId,
    formState: s.formState,
    updateForm: s.updateForm,
    newPhotoData: s.newPhotoData,
    setNewPhotoData: s.setNewPhotoData,
    appLang: s.appLang,
    filterCatId: s.filterCatId,
    filterTagIds: s.filterTagIds,
    debouncedSearchQuery: s.debouncedSearchQuery,
    sortOrder: s.sortOrder,
    abortAnalysis: s.abortAnalysis,
    setBatchEditingIds: s.setBatchEditingIds,
    setEditPhotoId: s.setEditPhotoId
  })));

  const { onDeletePhoto, onUpdatePhoto, onAiAnalyze } = usePhotoActions();

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: true
  }, PAGINATION.ADMIN_BATCH_SIZE);

  const photos = React.useMemo(() => {
    const allPhotos = infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [infinitePhotosQuery.data]);

  const t = translations[appLang as keyof typeof translations] || translations.en;

  // Helper from useAdminDataPrep logic usually
  const editPhotoPreview = React.useMemo(() => {
    if (!editPhotoId) return null;
    const photo = photos.find((p: Photo) => p.id === editPhotoId);
    return photo ? getCacheBustedImageUrl(photo, 'image') : null;
  }, [editPhotoId, photos]);

  const resetAddState = React.useCallback(() => {
    setNewPhotoData(null);
    setEditPhotoId(null);
    setBatchEditingIds(null);
  }, [setNewPhotoData, setEditPhotoId, setBatchEditingIds]);
  
  // We need to provide the same interface but ideally this hook would also pull from store
  const logic = usePhotoEditLogic({
    photos,
    editPhotoId,
    formState,
    updateForm,
    newPhotoData,
    editPhotoPreview,
    setNewPhotoData,
    analyzeSingle: async (p: Photo) => {
      if (onAiAnalyze) {
        return onAiAnalyze(p);
      }
    }, 
    saveNewPhoto: async () => {
      if (editPhotoId && onUpdatePhoto) {
        // Map formState to partial edit to update in cloud
        const updates: any = { ...formState };
        if (newPhotoData) {
          updates.uri = newPhotoData;
        }
        await onUpdatePhoto(editPhotoId, updates);
        setNewPhotoData(null); // Reset rotated image preview draft on success
        setEditPhotoId(null); // Close the drawer upon successful save
      }
    }
  });

  if (!editPhotoId && !newPhotoData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe pb-safe"
    >
      <DrawerHeader 
        editPhotoId={editPhotoId}
        formState={formState}
        updateForm={updateForm}
        isAnalyzing={logic.isAnalyzing}
        aiDebugInfo={logic.aiDebugInfo}
        isPartOfGroup={logic.isPartOfGroup}
        isSyncing={logic.sessionSyncing}
        onAbort={abortAnalysis}
        onAiAnalyze={logic.triggerAiAnalyze}
        onDelete={onDeletePhoto ? () => {
          logic.setAlertDialog({
            title: '确定要删除此照片吗？',
            message: '此操作不可撤销，照片将从云端彻底移除。',
            onConfirm: () => onDeletePhoto!(editPhotoId!),
            confirmLabel: '删除',
            type: 'danger'
          });
        } : undefined}
        onSave={logic.handleSave}
        onToggleHidden={logic.toggleHidden}
        onClose={() => {
          resetAddState();
          setEditPhotoId(null);
        }}
        onErrorClick={(err) => {
          const readableError = err.includes('|') ? err.split('|').slice(1).join(': ') : err;
          logic.showError(new Error(readableError), 'AI识别错误');
        }}
      />

      <div className="flex-1 overflow-hidden flex flex-col pt-2">
        <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pb-2 border-b border-slate-100 bg-white">
            <TabsList className="w-full bg-slate-100/50 p-1 rounded-2xl h-12 flex items-center gap-1 border border-slate-200">
              <TabsTrigger value="basic" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">基础 / BASIC</TabsTrigger>
              <TabsTrigger value="org" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">分类 / ORG</TabsTrigger>
              <TabsTrigger value="details" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">细节 / DETAIL</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
            <TabsContent value="basic">
              <BasicInfoTab 
                editPhotoId={editPhotoId}
                formState={formState}
                updateForm={updateForm}
                previewSrc={newPhotoData || editPhotoPreview}
                isProcessingImage={logic.isProcessingImage}
                onRotate={logic.rotatePhoto}
              />
            </TabsContent>

            <TabsContent value="org">
              <OrgTab 
                formState={formState}
                updateForm={updateForm}
                categories={logic.categories}
                tags={logic.tags}
                manufacturers={logic.manufacturers}
                appLang={logic.appLang}
                onAddTag={logic.addTag}
                onUpdateTag={logic.updateTag}
                onDeleteTag={logic.deleteTag}
                onAddManufacturer={() => {
                  logic.setPromptDialog({
                    title: '新增厂商 / New Manufacturer',
                    placeholder: '输入厂商名称',
                    onSubmit: async (name) => { await logic.addManufacturer(name); }
                  })
                }}
                onEditManufacturer={(mfr) => {
                  logic.setPromptDialog({
                    title: '编辑生产商 / Edit Manufacturer',
                    placeholder: mfr.name,
                    onSubmit: async (name) => {
                      const trimmed = name.trim();
                      if(trimmed) await logic.updateManufacturer(mfr.id, { name: trimmed });
                    }
                  });
                }}
                onUpdateManufacturer={logic.updateManufacturer}
                onDeleteManufacturer={logic.deleteManufacturer}
              />
            </TabsContent>

            <TabsContent value="details">
              <DetailsTab 
                formState={formState}
                updateForm={updateForm}
                showAiButton={true}
                isAnalyzing={logic.isAnalyzing}
                onAiAnalyze={logic.triggerAiAnalyze}
                t={t}
              />
            </TabsContent>
          </div>
        </Tabs>
        <div className="h-10 shrink-0"></div>
      </div>
    </motion.div>
  );
};
