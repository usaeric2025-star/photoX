import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { Photo } from "../../../types";
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
import { analyzeProductPhoto } from "@/services/geminiService";

import { 
  usePhotos,
  useSettings,
  useCategories,
  useTags,
  useManufacturers,
  useTaskExecutor,
  useErrorHandler,
  usePhotoDetail
} from "../../../hooks";
import { toast } from "@/lib/ui/toast";
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
  const formState = useUIStore((s) => s.formState);
  const updateForm = useUIStore((s) => s.updateForm);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const adminActions = useAdminActions();
  const onDeletePhoto = (id: string) => adminActions.deletePhoto([id]);
  const onUpdatePhoto = (id: string, data: Partial<Photo>) =>
    adminActions.updatePhoto(id, data);

  const { settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: manufacturers = [] } = useManufacturers();
  const { runTask } = useTaskExecutor();
  const { handleError } = useErrorHandler();

  const { data: detailPhoto, isLoading: isDetailLoading } = usePhotoDetail(editPhotoId || '');

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

    await runTask("AI 属性智能识别", async () => {
      const result = await analyzeProductPhoto(
        imageUrl,
        categories,
        tags,
        manufacturers,
        settings?.gemini_api_key || "",
        "google",
        settings?.custom_model || ""
      );

      if (result) {
        updateForm((prev) => {
          const updates: any = {};

          // 1. Name logic: Only if empty OR is just numbers
          const currentName = (prev.name || '').trim();
          const isNumeric = /^\d+$/.test(currentName);
          if (!currentName || isNumeric) {
            if (result.name) updates.name = result.name;
          }

          // 2. Other basic fields: Only if empty/unset
          if (!prev.category_id && result.category_id) updates.category_id = String(result.category_id);
          
          if ((!prev.tag_ids || prev.tag_ids.length === 0) && Array.isArray(result.tag_ids)) {
            updates.tag_ids = result.tag_ids.map((id: any) => String(id));
          }

          if (!prev.manufacturer_id && result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
          if (!prev.model_number && result.model_number) updates.model_number = result.model_number;
          if (!prev.manual_code && result.manual_code) updates.manual_code = result.manual_code;
          if (!prev.description && result.description) updates.description = result.description;
          
          if (result.description_translations && (!prev.description_translations || (!prev.description_translations.en && !prev.description_translations.ms))) {
             updates.description_translations = {
               ...prev.description_translations,
               ...result.description_translations
             };
          }

          if ((!prev.dimensions || prev.dimensions.length === 0) && Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions;
          }

          if (!prev.price && result.price) updates.price = String(result.price);

          return { ...prev, ...updates };
        });
        toast.success("AI 属性识别成功并已补全空白字段");
      }
    });
  }, [categories, tags, manufacturers, settings, runTask, updateForm, handleError]);

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

  const photos = React.useMemo(() => {
    const allPhotos =
      infinitePhotosQuery.data?.pages.flatMap((p) => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [infinitePhotosQuery.data]);

  const lastInitializedIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!editPhotoId) {
      lastInitializedIdRef.current = null;
      return;
    }
    if (editPhotoId !== lastInitializedIdRef.current && detailPhoto) {
      lastInitializedIdRef.current = editPhotoId;
      updateForm({
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
  }, [editPhotoId, detailPhoto, updateForm]);

  React.useEffect(() => {
    const handleAIResult = (event: Event) => {
      const customEvent = event as CustomEvent;
      const result = customEvent.detail;
      if (!result) return;

      const updates: any = {};
      if (result.name) updates.name = result.name;
      if (result.category) {
        // Need to find category ID by name
        const cat = categories.find(c => 
          c.name.toLowerCase() === result.category.toLowerCase() || 
          c.en?.toLowerCase() === result.category.toLowerCase() ||
          c.zh?.toLowerCase() === result.category.toLowerCase()
        );
        if (cat) updates.category_id = cat.id;
      }
      if (Array.isArray(result.tags)) {
        // Find tag IDs by name
        const tagIds = result.tags.map((tagName: string) => {
          const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          return tag?.id;
        }).filter(Boolean);
        if (tagIds.length > 0) updates.tag_ids = tagIds;
      }
      if (result.description) updates.description = result.description;
      if (Array.isArray(result.colors)) {
        // If the form has colors field, but let's see. 
        // Based on useUIStore, formState doesn't have colors/materials directly for single photos, 
        // but maybe we can append to description or something if not exist.
        // For now, let's just stick to what's in ProductFormData.
      }
      
      updateForm(updates);
    };

    window.addEventListener('ai-analysis-result', handleAIResult);
    return () => window.removeEventListener('ai-analysis-result', handleAIResult);
  }, [categories, tags, updateForm]);

  const t =
    translations[
      appLang as keyof typeof translations as keyof typeof translations
    ] || translations.en;

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
    formState,
    updateForm,
    newPhotoData,
    editPhotoPreview: editPhotoId && photos.find((p: Photo) => p.id === editPhotoId) ? getCacheBustedImageUrl(photos.find((p: Photo) => p.id === editPhotoId)!, "image") : null,
    analyzeSingle: async (p: Photo) => {
      if (onAiAnalyze) {
        return onAiAnalyze(p);
      }
    },
    saveNewPhoto: async () => {
      if (editPhotoId && onUpdatePhoto) {
        const updates: Partial<Photo> & { uri?: string } = { ...formState };
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
                    formState={formState}
                    updateForm={updateForm}
                    isAnalyzing={logic.isAnalyzing}
                    aiDebugInfo={logic.aiDebugInfo}
                    isPartOfGroup={logic.isPartOfGroup}
                    isSyncing={logic.isSyncing}
                    onAbort={onCancelAnalyze}
                    onAiAnalyze={logic.triggerAiAnalyze}
                    onDelete={
                      onDeletePhoto
                        ? () => {
                            update({
                              alertDialog: {
                                title: "确定要删除此照片吗？",
                                message:
                                  "此操作不可撤销，照片将从云端彻底移除。",
                                onConfirm: () => onDeletePhoto!(editPhotoId!),
                                confirmLabel: "删除",
                                type: "danger",
                              },
                            });
                          }
                        : undefined
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
                            formState={formState}
                            updateForm={updateForm}
                            previewSrc={newPhotoData || editPhotoPreview}
                            isProcessingImage={logic.isRotating}
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
