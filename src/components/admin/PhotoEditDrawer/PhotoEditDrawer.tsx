import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { Photo } from "../../../types";
import { HeadlessSlot } from "../../../lib/component-contract";
import { usePhotoEditLogic } from "./usePhotoEditLogic";
import { DrawerHeader } from "./DrawerHeader";
import { useUIStore, useShallow } from "../../../store";
import { BasicInfoTab } from "./BasicInfoTab";
import { OrgTab } from "./OrgTab";
import { DetailsTab } from "./DetailsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { getCacheBustedImageUrl } from "../../../lib/ui-helpers";
import { translations } from "../../../lib/translations";

import { 
  usePhotoInfiniteList,
  useSettings,
  useCategories,
  useTags,
  useManufacturers,
  useTaskExecutor,
  useErrorHandler
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

  const { editPhotoId, formState, updateForm, newPhotoData, appLang, update } = useUIStore(
    useShallow((s) => ({
      editPhotoId: s.editPhotoId,
      formState: s.formState,
      updateForm: s.updateForm,
      newPhotoData: s.newPhotoData,
      update: s.update,
      appLang: s.appLang,
    })),
  );

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
      const { analyzeProductPhoto } = await import("@/services/gemini");
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
        const updates: any = {};
        if (result.name) updates.name = result.name;
        if (result.category_id) updates.category_id = String(result.category_id);
        if (Array.isArray(result.tag_ids)) {
          updates.tag_ids = result.tag_ids.map((id: any) => String(id));
        }
        if (result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
        if (result.model_number) updates.model_number = result.model_number;
        if (result.manual_code) updates.manual_code = result.manual_code;
        if (result.description) updates.description = result.description;
        if (Array.isArray(result.dimensions)) updates.dimensions = result.dimensions;
        if (result.price) updates.price = String(result.price);

        updateForm(updates);
        toast.success("AI 属性识别成功并已填入表格");
      }
    });
  }, [categories, tags, manufacturers, settings, runTask, updateForm, handleError]);

  const onCancelAnalyze = () => {};

  const infinitePhotosQuery = usePhotoInfiniteList(
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
    if (editPhotoId !== lastInitializedIdRef.current) {
      const photo = photos.find((p: Photo) => p.id === editPhotoId);
      if (photo) {
        lastInitializedIdRef.current = editPhotoId;
        updateForm({
          name: photo.name || "",
          category_id: photo.category_id || "",
          tag_ids: Array.isArray(photo.tag_ids) ? photo.tag_ids : [],
          manufacturer_id: photo.manufacturer_id || "",
          model_number: photo.model_number || "",
          manual_code: photo.manual_code || "",
          description: photo.description || "",
          dimensions: Array.isArray(photo.dimensions) ? photo.dimensions : [],
          is_hidden: photo.is_hidden || false,
          price: photo.price || "",
          is_group_cover: photo.is_group_cover || false,
        });
      }
    }
  }, [editPhotoId, photos, updateForm]);

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

  const resetAddState = React.useCallback(() => {
    update({ newPhotoData: null });
    update({ editPhotoId: null });
    update({ batchEditingIds: null });
  }, [update]);

  const logic = usePhotoEditLogic({
    photos,
    editPhotoId,
    formState,
    updateForm,
    newPhotoData,
    editPhotoPreview,
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
