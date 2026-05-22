import React from 'react';
import { motion } from 'motion/react';
import { Photo, ProductFormData } from '../../../types';
import { usePhotoEditLogic } from './usePhotoEditLogic';
import { DrawerHeader } from './DrawerHeader';
import { useGalleryStore } from '../../../store';
import { BasicInfoTab } from './BasicInfoTab';
import { OrgTab } from './OrgTab';
import { DetailsTab } from './DetailsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";

interface Props {
  editPhotoId: string | null;
  resetAddState: () => void;
  saveNewPhoto: () => Promise<void>;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
  editPhotoPreview?: string | null;
  onDelete?: (id: string) => void;
  newPhotoData?: string | null;
  setNewPhotoData?: (data: string | null) => void;
  abortAnalysis?: () => void;
  handleSingleAiAnalyze: (imageData: string | null, catId?: string, editId?: string) => Promise<any>;
  handleTranslate: (text: string, currentLang: string, targetLang: string) => Promise<string>;
  photos: Photo[];
  t: any;
}

export const PhotoEditDrawer: React.FC<Props> = (props) => {
  const setEditingPhotoId = useGalleryStore((s) => s.setEditingPhotoId);
  const logic = usePhotoEditLogic({
    photos: props.photos,
    editPhotoId: props.editPhotoId,
    formState: props.formState,
    updateForm: props.updateForm,
    newPhotoData: props.newPhotoData,
    editPhotoPreview: props.editPhotoPreview,
    setNewPhotoData: props.setNewPhotoData,
    handleSingleAiAnalyze: props.handleSingleAiAnalyze,
    saveNewPhoto: props.saveNewPhoto
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe pb-safe"
    >
      <DrawerHeader 
        editPhotoId={props.editPhotoId}
        formState={props.formState}
        updateForm={props.updateForm}
        isAnalyzing={logic.isAnalyzing}
        aiDebugInfo={logic.aiDebugInfo}
        isPartOfGroup={logic.isPartOfGroup}
        isSyncing={logic.sessionSyncing}
        onAbort={props.abortAnalysis}
        onAiAnalyze={logic.triggerAiAnalyze}
        onDelete={props.onDelete ? () => {
          logic.setAlertDialog({
            title: '确定要删除此照片吗？',
            message: '此操作不可撤销，照片将从云端彻底移除。',
            onConfirm: () => props.onDelete!(props.editPhotoId!),
            confirmLabel: '删除',
            type: 'danger'
          });
        } : undefined}
        onSave={logic.handleSave}
        onToggleHidden={logic.toggleHidden}
        onClose={() => {
          props.resetAddState();
          setEditingPhotoId(null);
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
                editPhotoId={props.editPhotoId}
                formState={props.formState}
                updateForm={props.updateForm}
                previewSrc={props.newPhotoData || props.editPhotoPreview}
                isProcessingImage={logic.isProcessingImage}
                onRotate={logic.rotatePhoto}
              />
            </TabsContent>

            <TabsContent value="org">
              <OrgTab 
                formState={props.formState}
                updateForm={props.updateForm}
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
                formState={props.formState}
                updateForm={props.updateForm}
                showAiButton={!!props.handleSingleAiAnalyze}
                isAnalyzing={logic.isAnalyzing}
                onAiAnalyze={logic.triggerAiAnalyze}
                t={props.t}
              />
            </TabsContent>
          </div>
        </Tabs>
        <div className="h-10 shrink-0"></div>
      </div>
    </motion.div>
  );
};
