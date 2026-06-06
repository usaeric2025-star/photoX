import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { PromptDialog } from "../../ui/PromptDialog";
import { ProductFormData, Photo } from "../../../types";
import { HeadlessSlot } from "../../../lib/component-contract";
import { usePhotoEditor } from "../../../hooks/core/usePhotoEditor";
import { DrawerHeader } from "./DrawerHeader";
import { useUIStore } from "../../../store";
import { BasicInfoTab } from "./BasicInfoTab";
import { OrgTab } from "./OrgTab";
import { DetailsTab } from "./DetailsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { getCacheBustedImageUrl } from "../../../lib/ui-helpers";
import { translations } from "../../../lib/translations";
import { analyzePhoto } from "@/services/aiService";

import { 
  usePhotos,
  usePhotoCount,
  useSettings,
  useCategories,
  useTags,
  useManufacturers,
  useTaskExecutor,
  useErrorHandler,
  usePhotoDetail,
  useRemoveFromGroupMutation
} from "../../../hooks";
import { toast } from "@/lib/ui/toast";
import { applyAIResult } from '@/lib/ai/aiMerger';
import { mergeSplitDimensions } from '@/lib/ai/dimensionMerger';
import { cleanPhotos } from "../../../lib/filters";
import { PAGINATION } from "../../../constants/config";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { useUrlFilters } from "@/hooks/useUrlFilters";

/**
 * [V2.14-SLOT-CONTRACT] PhotoEditDrawer Props
 */
interface PhotoEditDrawerProps {
  slots?: {
    drawerHeader?: HeadlessSlot<any>;
    tabs?: HeadlessSlot<any>;
  };
}

export function PhotoEditDrawer({ slots }: PhotoEditDrawerProps) {
  const { filters: urlFilters } = useUrlFilters();
  const {
    categoryId: filterCatId,
    tagId: filterTagId,
    searchQuery: debouncedSearchQuery,
  } = urlFilters;

  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const form = useForm<ProductFormData>({
    initialValues: {
      name: { zh: "", en: "", ms: "" },
      category_id: null,
      manufacturer_id: null,
      tag_ids: [],
      description: { zh: "", en: "", ms: "" },
      item_code: "",
      manual_code: "",
      model_number: "",
      dimensions: [],
      is_hidden: false,
      price: "",
      is_group_cover: false,
    },
  });

  const adminActions = useAdminActions();
  const { mutateAsync: removeFromGroup } = useRemoveFromGroupMutation();
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  const [isAddMfrOpen, addMfrDialog] = useDisclosure(false);
  const [isEditMfrOpen, editMfrDialog] = useDisclosure(false);
  const [editingMfr, setEditingMfr] = React.useState<{ id: string; name: string } | null>(null);

  const onDeletePhoto = () => deleteDialog.open();
  
  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.group_id) {
        await removeFromGroup({ photoIds: [editPhotoId], groupId: detailPhoto.group_id });
        update({ editPhotoId: null });
        toast.success("已移出合组");
    }
  };
  
  const onUpdatePhoto = (id: string, data: Partial<Photo>) =>
    adminActions.updatePhoto(id, data);

  const { settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: manufacturers = [] } = useManufacturers();
  const { runTask } = useTaskExecutor();
  const { handleError } = useErrorHandler();

  const { data: detailPhoto } = usePhotoDetail(editPhotoId || '');

  const onAiAnalyze = React.useCallback(async (photo: Photo) => {
    const imageUrl = photo.uri || photo.image_url;
    if (!imageUrl) {
      handleError(new Error("照片没有有效的图片地址"), "AI 识别失败");
      return;
    }

    if (!settings?.gemini_api_key) {
      toast.error("请先在‘管理后台 -> 系统配置’中配置 Gemini API 密钥再使用 AI 识别功能。");
      return;
    }

    await runTask("AI 属性智能識別", async ({ updateProgress }) => {
      updateProgress(30, appLang === 'zh' ? 'AI 识别中...' : 'Identifying...');
      const resp = await analyzePhoto(photo.id);

      if (resp.ok) {
        updateProgress(85, appLang === 'zh' ? '正在应用数据...' : 'Applying data...');
        const result = resp.data;
        
        const prev = form.values;
        const updates: any = {};
        const currentNameZh = (prev.name?.zh || '').trim();
        const isNumeric = /^\d+$/.test(currentNameZh);
        
        if (!currentNameZh || isNumeric) {
          if (result.name_translations) {
            updates.name = {
              zh: result.name_translations.zh || prev.name?.zh || '',
              en: (result.name_translations.en || prev.name?.en || '').toUpperCase(),
              ms: (result.name_translations.ms || prev.name?.ms || '').toUpperCase()
            };
          } else if (result.name) {
            updates.name = { 
              zh: result.name, 
              en: (prev.name?.en || result.name).toUpperCase(), 
              ms: (prev.name?.ms || result.name).toUpperCase() 
            };
          }
        }
        if (!prev.category_id && result.category_id) updates.category_id = String(result.category_id);
        
        // Merge tags 防覆蓋: Keep existing tags, append AI tags up to limit (3)
        const existingTags = prev.tag_ids || [];
        const aiTags = (result.tag_ids || []).map((id: any) => String(id));
        const mergedTagIds = [...existingTags];
        for (const tid of aiTags) {
          if (!mergedTagIds.includes(tid) && mergedTagIds.length < 3) {
            mergedTagIds.push(tid);
          }
        }
        updates.tag_ids = mergedTagIds;

        if (!prev.manufacturer_id && result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
        if (!prev.model_number && result.model_number) updates.model_number = result.model_number;
        if (!prev.group_id && result.group_id) updates.group_id = String(result.group_id);
        if (!prev.manual_code && result.manual_code) updates.manual_code = result.manual_code;
        
        if (result.description_translations) {
           updates.description = { 
             ...prev.description, 
             ...result.description_translations,
             zh: result.description_translations.zh || result.description || prev.description?.zh
           };
        } else if (result.description && !prev.description?.zh) {
           updates.description = { ...prev.description, zh: result.description };
        }
        
        // Handle dimensions defensive + standardization
        if ((!prev.dimensions || prev.dimensions.length === 0) && Array.isArray(result.dimensions)) {
           const mergedDims = mergeSplitDimensions(result.dimensions);
           updates.dimensions = mergedDims.map((d: any) => {
             // Basic defensive validation
             const label = (d.label || '').trim();
             return {
               ...d,
               label: label && !label.includes(':') ? `${label}: ` : label,
               height: Number(d.height) || 0,
               width: Number(d.width) || 0,
               length: Number(d.length) || 0,
               unit: d.unit === 'in' || d.unit === 'inches' ? 'inch' : (d.unit || 'cm')
             };
           });
        }
        
        if (!prev.price && result.price) updates.price = String(result.price);

        const merged = { ...prev, ...updates };
        form.setValues(merged);
        
        // Auto-save the AI result directly to DB
        updateProgress(90, appLang === 'zh' ? '正在自动保存...' : 'Auto-saving...');
        console.log('[AI Raw Debug]', result);
        await onUpdatePhoto(photo.id, merged); 
        
        updateProgress(100, appLang === 'zh' ? '识别并保存成功' : 'Success');
        toast.success(appLang === 'zh' ? "AI 识别成功并已自动保存" : "AI identified and auto-saved", {
          action: {
            label: appLang === 'zh' ? "复制原始数据" : "Copy Raw Data",
            onClick: () => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2));
              toast.success(appLang === 'zh' ? "已复制到剪贴板" : "Copied to clipboard");
            }
          }
        });
      } else {
        const errorMsg = (resp as any).message || "AI 分析失敗";
        toast.error(`識別失敗: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    }, { showProgress: true, showSuccessToast: false });
  }, [categories, tags, manufacturers, settings, runTask, onUpdatePhoto, form, handleError, appLang]);

  const onCancelAnalyze = () => {};

  const infinitePhotosQuery = usePhotos(
    {
      category_id: filterCatId,
      tag_id: filterTagId,
      searchQuery: debouncedSearchQuery,
      sortOrder: urlFilters.sortOrder,
      isAdminMode: true,
    },
    PAGINATION.ADMIN_BATCH_SIZE,
  );

  const photoCountQuery = usePhotoCount({
    category_id: filterCatId,
    tag_id: filterTagId,
    searchQuery: debouncedSearchQuery,
    isAdminMode: true,
  });

  const photos = React.useMemo(() => {
    const allPhotos =
      infinitePhotosQuery.data?.pages.flatMap((p) => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [infinitePhotosQuery.data]);

  const totalPhotosCount = photoCountQuery.data || 0;

  const lastInitializedIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!editPhotoId) {
      lastInitializedIdRef.current = null;
      return;
    }
    if (editPhotoId !== lastInitializedIdRef.current && detailPhoto) {
      lastInitializedIdRef.current = editPhotoId;
      form.setValues({
        name: typeof detailPhoto.name === 'object' ? detailPhoto.name : { zh: detailPhoto.name || '', en: '', ms: '' },
        category_id: detailPhoto.category_id || "",
        tag_ids: Array.isArray(detailPhoto.tag_ids) ? detailPhoto.tag_ids : [],
        manufacturer_id: detailPhoto.manufacturer_id || "",
        item_code: detailPhoto.item_code || "",
        model_number: detailPhoto.model_number || "",
        manual_code: detailPhoto.manual_code || "",
        description: typeof detailPhoto.description === 'object' ? detailPhoto.description : { zh: detailPhoto.description || '', en: '', ms: '' },
        dimensions: Array.isArray(detailPhoto.dimensions) ? detailPhoto.dimensions : [],
        is_hidden: detailPhoto.is_hidden || false,
        price: detailPhoto.price || "",
        is_group_cover: detailPhoto.is_group_cover || false,
      }) as any;
    }
  }, [editPhotoId, detailPhoto, form]);

  React.useEffect(() => {
    const handleAIResult = (event: Event) => {
      const customEvent = event as CustomEvent;
      const result = customEvent.detail;
      if (!result) return;

      const merged = applyAIResult(form.values, result, {
        categories,
        tags,
        preserveFields: ['name', 'category_id']
      });
      
      form.setValues(merged);
    };

    window.addEventListener('ai-analysis-result', handleAIResult);
    return () => window.removeEventListener('ai-analysis-result', handleAIResult);
  }, [categories, tags, form]);

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form]);

  const t = translations[appLang as keyof typeof translations] || translations.en;

  const editPhotoPreview = React.useMemo(() => {
    if (!editPhotoId) return null;
    const photo = detailPhoto || photos.find((p: Photo) => p.id === editPhotoId);
    return photo ? getCacheBustedImageUrl(photo, "image") : null;
  }, [editPhotoId, photos, detailPhoto]);

  const resetAddState = () => {
    update({ newPhotoData: null });
    update({ editPhotoId: null });
    update({ batchEditingIds: null });
  };

  const logic = usePhotoEditor({
    photos,
    editPhotoId,
    form,
    newPhotoData,
    editPhotoPreview: (editPhotoId && (detailPhoto || photos.find((p: Photo) => p.id === editPhotoId))) ? getCacheBustedImageUrl((detailPhoto || photos.find((p: Photo) => p.id === editPhotoId))!, "image") : null,
    analyzeSingle: async (p: Photo) => onAiAnalyze ? onAiAnalyze(p) : undefined,
    saveNewPhoto: async () => {
      if (editPhotoId && onUpdatePhoto) {
        const updates: Partial<Photo> & { uri?: string } = { ...form.values };
        if (newPhotoData) {
          updates.uri = newPhotoData;
        }
        await onUpdatePhoto(editPhotoId, updates as Partial<Photo>);
        update({ newPhotoData: null });
        update({ editPhotoId: null });
      }
    },
  });

  const isOpen = !!(editPhotoId || newPhotoData);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && update({ editPhotoId: null })}
    >
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[var(--z-index-max)] bg-black/20 backdrop-blur-sm"
                />
              }
            />
            <Dialog.Popup
              render={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="fixed inset-0 z-[var(--z-index-max)] bg-slate-50 flex flex-col pt-safe pb-safe shadow-2xl focus:outline-none"
                >
                  <DrawerHeader
                    editPhotoId={editPhotoId}
                    form={form}
                    isAnalyzing={logic.isAnalyzing}
                    aiDebugInfo={logic.aiDebugInfo}
                    isPartOfGroup={logic.isPartOfGroup}
                    isSyncing={logic.isSyncing}
                    onAbort={onCancelAnalyze}
                    onAiAnalyze={logic.triggerAiAnalyze}
                    onDelete={
                      onDeletePhoto ? () => onDeletePhoto() : undefined
                    }
                    onSave={logic.handleSave}
                    onToggleHidden={logic.toggleHidden}
                    onRemoveFromGroup={onRemoveFromGroup}
                    onClose={() => {
                      resetAddState();
                      update({ editPhotoId: null });
                    }}
                    onErrorClick={(err: any) => {
                      const readableError = String(err).includes("|")
                        ? String(err).split("|").slice(1).join(": ")
                        : String(err);
                      logic.handleError(new Error(readableError), "AI识别错误");
                    }}
                    isRunning={logic.isRunning}
                    totalPhotosCount={totalPhotosCount}
                  />

                  <ConfirmDialog
                    open={isDeleteOpen}
                    onOpenChange={deleteDialog.toggle}
                    title="确定要删除此照片吗？"
                    description="此操作不可撤销，照片将从云端彻底移除。"
                    confirmText="删除"
                    variant="destructive"
                    onConfirm={async () => {
                      if (editPhotoId) {
                        await adminActions.deletePhoto([editPhotoId]);
                      }
                    }}
                  />

                  <div className="flex-1 overflow-hidden flex flex-col pt-2">
                    <Tabs
                      defaultValue="basic"
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      <div className="container mx-auto max-w-4xl px-4">
                        <div className="pb-2 border-b border-slate-100 bg-white">
                          <TabsList className="w-full bg-slate-100/50 p-1 rounded-2xl h-12 flex items-center gap-1 border border-slate-200">
                            <TabsTrigger
                              value="basic"
                              className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full"
                            >
                              基础 / BASIC
                            </TabsTrigger>
                            <TabsTrigger
                              value="org"
                              className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full"
                            >
                              分类 / ORG
                            </TabsTrigger>
                            <TabsTrigger
                              value="details"
                              className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full"
                            >
                              细节 / DETAIL
                            </TabsTrigger>
                          </TabsList>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar pt-2 container mx-auto max-w-4xl px-4 pb-12">
                        <TabsContent value="basic">
                          <BasicInfoTab
                            editPhotoId={editPhotoId}
                            form={form}
                            previewSrc={newPhotoData || editPhotoPreview}
                            isProcessingImage={logic.isRotating}
                            onRotate={logic.rotatePhoto}
                          />
                        </TabsContent>

                        <TabsContent value="org">
                          <OrgTab
                            form={form}
                            categories={logic.categories}
                            tags={logic.tags}
                            manufacturers={logic.manufacturers}
                            appLang={logic.appLang}
                            onAddTag={logic.addTag}
                            onUpdateTag={logic.updateTag}
                            onDeleteTag={logic.deleteTag}
                            onAddManufacturer={addMfrDialog.open}
                            onEditManufacturer={(mfr) => {
                              setEditingMfr(mfr);
                              editMfrDialog.open();
                            }}
                            onUpdateManufacturer={logic.updateManufacturer}
                            onDeleteManufacturer={logic.deleteManufacturer}
                          />
                        </TabsContent>

                        <TabsContent value="details">
                          <DetailsTab
                            form={form}
                            showAiButton={true}
                            isAnalyzing={logic.isAnalyzing}
                            onAiAnalyze={logic.triggerAiAnalyze}
                            t={t}
                          />
                        </TabsContent>

                        <PromptDialog
                          open={isAddMfrOpen}
                          onOpenChange={addMfrDialog.toggle}
                          title="新增厂商 / New Manufacturer"
                          placeholder="输入厂商名称"
                          onConfirm={async (name: string) => {
                            await logic.addManufacturer(name);
                          }}
                        />

                        <PromptDialog
                          open={isEditMfrOpen}
                          onOpenChange={editMfrDialog.toggle}
                          title="编辑生产商 / Edit Manufacturer"
                          placeholder={editingMfr?.name || "输入新名称"}
                          onConfirm={async (name: string) => {
                            const trimmed = name.trim();
                            if (trimmed && editingMfr)
                              await logic.updateManufacturer(editingMfr.id, {
                                name: trimmed,
                              });
                            setEditingMfr(null);
                          }}
                        />
                      </div>
                    </Tabs>
                  </div>
                </motion.div>
              }
            />
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
