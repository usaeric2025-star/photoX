import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { useDisclosure } from "@mantine/hooks";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { ProductFormData, Photo } from "../../../types";
import { HeadlessSlot } from "../../../lib/component-contract";
import { DrawerHeader } from "./DrawerHeader";
import { useUIStore } from "../../../store";
import { BasicInfoTab } from "./BasicInfoTab";
import { OrgTab } from "./OrgTab";
import { DetailsTab } from "./DetailsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { translations } from "../../../lib/translations";

import { 
  usePhotoDetail,
  usePhotoEdit,
  usePhotoDelete,
  usePhotoEditMutation
} from "../../../hooks";
import { toast } from 'sonner';
import { useTasks } from "@/hooks";
import { UseFormReturnType } from "@mantine/form";

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
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const { data: detailPhoto } = usePhotoDetail(editPhotoId || '');
  const form = usePhotoEdit(detailPhoto || null);

  const { mutateAsync: updatePhotoMutation } = usePhotoEditMutation();
  const { mutateAsync: deletePhoto } = usePhotoDelete();

  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  const { tasks } = useTasks();

  const editPhotoPreview = form.values.uri || detailPhoto?.image_url || '';
  const resetAddState = () => update({ newPhotoData: null });

  const isRunning = React.useMemo(() => tasks.some((t: any) => t.status === 'running'), [tasks]);

  const t = translations[appLang as keyof typeof translations] || translations.en;

  const handleSave = async () => {
    if (!editPhotoId) return;
    
    try {
      const updates: Partial<Photo> & { uri?: string } = { ...form.values };
      if (newPhotoData) {
        updates.uri = newPhotoData;
      }

      if (!updates.name?.zh && !updates.description?.zh) {
        toast.error("照片信息不完整 / Incomplete information");
        return;
      }

      await updatePhotoMutation({ id: editPhotoId, updates: updates as Partial<Photo> });
      update({ newPhotoData: null });
      update({ editPhotoId: null });
    } catch (err) {
      // Error toasted by mutation factory
    }
  };

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
                    form={form}
                    onSave={handleSave}
                    onClose={() => {
                      resetAddState();
                      update({ editPhotoId: null });
                    }}
                    previewSrc={newPhotoData || editPhotoPreview}
                  />

                  <ConfirmDialog
                    open={isDeleteOpen}
                    onOpenChange={deleteDialog.toggle}
                    title={t.confirmDeleteTitle}
                    description={t.confirmDeleteDesc}
                    confirmText={t.deleteBtn}
                    variant="destructive"
                    onConfirm={async () => {
                      if (editPhotoId) {
                        try {
                          await deletePhoto([editPhotoId]);
                          update({ editPhotoId: null });
                        } catch (err) {}
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
                              {appLang === 'zh' ? '基础' : 'BASIC'}
                            </TabsTrigger>
                            <TabsTrigger
                              value="org"
                              className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full"
                            >
                              {appLang === 'zh' ? '组织' : 'ORG'}
                            </TabsTrigger>
                            <TabsTrigger
                              value="details"
                              className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full"
                            >
                              {appLang === 'zh' ? '细节' : 'DETAIL'}
                            </TabsTrigger>
                          </TabsList>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar pt-2 container mx-auto max-w-4xl px-4 pb-12">
                        <TabsContent value="basic">
                          <BasicInfoTab
                            form={form}
                          />
                        </TabsContent>

                        <TabsContent value="org">
                          <OrgTab
                            form={form}
                          />
                        </TabsContent>

                        <TabsContent value="details">
                          <DetailsTab
                            form={form}
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
