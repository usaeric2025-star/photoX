import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { useForm } from "@mantine/form";
import { ProductFormData, Photo } from "../../../types";
import { HeadlessSlot } from "../../../lib/component-contract";
import { usePhotoEditLogic } from "./usePhotoEditLogic";
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
  usePhotoDetail
} from "../../../hooks";
import { toast } from "@/lib/ui/toast";
import { applyAIResult } from '@/lib/ai/aiMerger';
import { cleanPhotos } from "../../../lib/filters";
import { PAGINATION } from "../../../constants/config";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useFilters } from "@/features/filters/useFilters";

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
  const { filters } = useFilters();
  const { filters: urlFilters } = useUrlFilters();
  const {
    categoryId: filterCatId,
    tagIds: filterTagIds,
    searchQuery: debouncedSearchQuery,
  } = filters;

  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const form = useForm<ProductFormData>({
    initialValues: {
      name: "",
      category_id: null,
      manufacturer_id: null,
      tag_ids: [],
      description: "",
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
  const onDeletePhoto = (id: string) => 
    update({
      alertDialog: {
        title: "确定要删除此照片吗？",
        message: "此操作不可撤销，照片将从云端彻底移除。",
        onConfirm: () => adminActions.deletePhoto([id]),
        confirmLabel: "删除",
        type: "danger",
      },
    });
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

    await runTask("AI 属性智能識別", async () => {
      const resp = await analyzePhoto(photo.id);

      if (resp.ok) {
        const result = resp.data;
        form.setValues((prev) => {
          const updates: any = {};
          const currentName = (prev.name || '').trim();
          const isNumeric = /^\d+$/.test(currentName);
          if (!currentName || isNumeric) {
            if (result.name) updates.name = result.name;
          }
          if (!prev.category_id && result.category_id) updates.category_id = String(result.category_id);
          if ((!prev.tag_ids || prev.tag_ids.length === 0) && Array.isArray(result.tag_ids)) {
            updates.tag_ids = result.tag_ids.map((id: any) => String(id));
          }
          if (!prev.manufacturer_id && result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
          if (!prev.model_number && result.model_number) updates.model_number = result.model_number;
          if (!prev.manual_code && result.manual_code) updates.manual_code = result.manual_code;
          if (!prev.description && result.description) updates.description = result.description;
          
          if (result.description_translations) {
             updates.description_translations = { 
               ...prev.description_translations, 
               ...result.description_translations,
               zh: result.description_translations.zh || result.description || prev.description_translations?.zh || prev.description
             };
          }
          
          if ((!prev.dimensions || prev.dimensions.length === 0) && Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions;
          } else if (Array.isArray(result.dimensions) && result.dimensions.length > 0) {
            // If we already have dimensions, append Agnes ones if they look like specifications
            const agnesDims = result.dimensions.filter((d: any) => d.label?.includes('Agnes'));
            if (agnesDims.length > 0) {
              updates.dimensions = [...(prev.dimensions || []), ...agnesDims];
            }
          }
          
          if (!prev.price && result.price) updates.price = String(result.price);

          return { ...prev, ...updates };
        });
        toast.success("AI 屬性識別成功並已補全空白字段（由 Agnes 提供動態翻譯）");
      } else {
        const errorMsg = (resp as any).message || "AI 分析失敗";
        toast.error(`識別失敗: ${errorMsg}`);
      }
    });
  }, [categories, tags, manufacturers, settings, runTask, form, handleError]);

  const onCancelAnalyze = () => {};

  const infinitePhotosQuery = usePhotos(
    {
      category_id: filterCatId,
      tag_id:
        Array.isArray(filterTagIds) && filterTagIds.length > 0
          ? filterTagIds[0]
          : null,
      searchQuery: debouncedSearchQuery,
      sortOrder: urlFilters.sortOrder,
      isAdminMode: true,
    },
    PAGINATION.ADMIN_BATCH_SIZE,
  );

  const photoCountQuery = usePhotoCount({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
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
        name: detailPhoto.name || "",
        category_id: detailPhoto.category_id || "",
        tag_ids: Array.isArray(detailPhoto.tag_ids) ? detailPhoto.tag_ids : [],
        manufacturer_id: detailPhoto.manufacturer_id || "",
        item_code: detailPhoto.item_code || "",
        model_number: detailPhoto.model_number || "",
        manual_code: detailPhoto.manual_code || "",
        description: detailPhoto.description || "",
        description_translations: detailPhoto.description_translations || { zh: detailPhoto.description || '', en: '', ms: '' },
        dimensions: Array.isArray(detailPhoto.dimensions) ? detailPhoto.dimensions : [],
        is_hidden: detailPhoto.is_hidden || false,
        price: detailPhoto.price || "",
        is_group_cover: detailPhoto.is_group_cover || false,
      });
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

  const t = translations[appLang as keyof typeof translations] || translations.en;

  const editPhotoPreview = React.useMemo(() => {
    if (!editPhotoId) return null;
    const photo = photos.find((p: Photo) => p.id === editPhotoId);
    return photo ? getCacheBustedImageUrl(photo, "image") : null;
  }, [editPhotoId, photos]);

  const resetAddState = () => {
    update({ newPhotoData: null });
    update({ editPhotoId: null });
    update({ batchEditingIds: null });
  };

  const logic = usePhotoEditLogic({
    photos,
    editPhotoId,
    form,
    newPhotoData,
    editPhotoPreview: editPhotoId && photos.find((p: Photo) => p.id === editPhotoId) ? getCacheBustedImageUrl(photos.find((p: Photo) => p.id === editPhotoId)!, "image") : null,
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
                  className="fixed inset-0 z-[599] bg-black/20 backdrop-blur-sm"
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
                  className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe pb-safe shadow-2xl focus:outline-none"
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
                      onDeletePhoto ? () => onDeletePhoto(editPhotoId!) : undefined
                    }
                    onSave={logic.handleSave}
                    onToggleHidden={logic.toggleHidden}
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
                            onAddManufacturer={() => {
                              update({
                                promptDialog: {
                                  title: "新增厂商 / New Manufacturer",
                                  placeholder: "输入厂商名称",
                                  onSubmit: async (name: string) => {
                                    await logic.addManufacturer(name);
                                  },
                                },
                              });
                            }}
                            onEditManufacturer={(mfr) => {
                              update({
                                promptDialog: {
                                  title: "编辑生产商 / Edit Manufacturer",
                                  placeholder: mfr.name,
                                  onSubmit: async (name: string) => {
                                    const trimmed = name.trim();
                                    if (trimmed)
                                      await logic.updateManufacturer(mfr.id, {
                                        name: trimmed,
                                      });
                                  },
                                },
                              });
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
