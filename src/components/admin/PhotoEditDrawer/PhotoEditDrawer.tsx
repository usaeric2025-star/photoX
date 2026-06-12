import React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { FormProvider } from "react-hook-form";
import { useFormWithMutation } from '@/hooks/core/useFormWithMutation';
import { usePhotoEditMutation } from '@/hooks/photo/usePhotoMutations';
import { Photo } from "../../../types";
import { HeadlessSlot } from "../../../lib/component-contract";
import { DrawerHeader } from "./DrawerHeader";
import { DeletePhotoDialog } from "./DeletePhotoDialog";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { useUIStore } from "../../../store";
import { translations } from "../../../lib/translations";
import { PhotoSchema } from "../../../../api/_shared/apiContractSchema";
import { 
  usePhoto,
  usePhotoDelete,
} from "../../../hooks";
import { useTasks } from "@/hooks";

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

  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const updateMutation = usePhotoEditMutation();
  const { mutateAsync: deletePhoto } = usePhotoDelete();

  const defaultValues = React.useMemo(() => ({
    name: detailPhoto?.name || { zh: '', en: '', ms: '' },
    description: detailPhoto?.description || { zh: '', en: '', ms: '' },
    category_id: detailPhoto?.category_id || null,
    manufacturer_id: detailPhoto?.manufacturer_id || null,
    tags: detailPhoto?.tags || [],
    item_code: detailPhoto?.item_code || '',
    manual_code: detailPhoto?.manual_code || '',
    model_number: detailPhoto?.model_number || '',
    dimensions: detailPhoto?.dimensions || [],
    is_hidden: detailPhoto?.is_hidden || false,
    price: detailPhoto?.price || '',
    is_group_cover: detailPhoto?.is_group_cover || false,
    group_id: detailPhoto?.group_id || null,
    uri: newPhotoData || detailPhoto?.image_url || '',
    id: editPhotoId || ''
  }), [detailPhoto, editPhotoId, newPhotoData]);

  const form = useFormWithMutation(
    PhotoSchema,
    defaultValues,
    updateMutation,
    {
      values: defaultValues,
    }
  ) as any;

  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  const { tasks } = useTasks();

  const resetAddState = () => update({ newPhotoData: null });
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const isOpen = !!(editPhotoId || newPhotoData);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && update({ editPhotoId: null })}
    >
        {isOpen && (
          <Dialog.Portal keepMounted>
            <FormProvider {...(form as any)}>
              <Dialog.Backdrop
                render={
                  <div className="fixed inset-0 z-[var(--z-index-max)] bg-black/20 backdrop-blur-sm animate-fade-in" />
                }
              />
              <Dialog.Popup
                render={
                  <div className="fixed inset-0 z-[var(--z-index-max)] bg-slate-50 flex flex-col pt-safe pb-safe shadow-2xl focus:outline-none animate-scale-in">
                    <DrawerHeader
                      form={form}
                      onClose={() => {
                        resetAddState();
                        update({ editPhotoId: null });
                      }}
                    />

                    <DeletePhotoDialog
                      open={isDeleteOpen}
                      onOpenChange={deleteDialog.toggle}
                      lang={appLang}
                      onDelete={async () => {
                        if (editPhotoId) {
                          try {
                            await deletePhoto([editPhotoId]);
                            update({ editPhotoId: null });
                            resetAddState();
                          } catch (err) {}
                        }
                      }}
                    />

                    <div className="flex-1 overflow-hidden flex flex-col pt-2">
			<PhotoEditTabs 
			  form={form}
			  editPhotoId={editPhotoId || ''}
			  appLang={appLang}
			/>
                    </div>
                  </div>
                }
              />
            </FormProvider>
          </Dialog.Portal>
        )}
    </Dialog.Root>
  );
}
