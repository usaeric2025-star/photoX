import React from "react";
import { PhotoEditSessionProvider } from '@/hooks/photo/PhotoEditSessionProvider';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { HeadlessSlot } from "@/lib/component-contract";
import { Modal } from "@/components/ui/Modal";
import { ModalHeader } from "./ModalHeader";
import { DeletePhotoDialog } from "../PhotoEditDrawer/DeletePhotoDialog";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { useUIStore } from "@/store";
import { 
  usePhotoDelete,
} from "@/hooks";

/**
 * [V2.14-SLOT-CONTRACT] PhotoEditModal Props
 */
interface PhotoEditModalProps {
  slots?: {
    modalHeader?: HeadlessSlot<any>;
    tabs?: HeadlessSlot<any>;
  };
}

export function PhotoEditModal({ slots }: PhotoEditModalProps) {
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const { mutateAsync: deletePhoto } = usePhotoDelete();

  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  const resetAddState = () => update({ newPhotoData: null });

  const isOpen = !!(editPhotoId || newPhotoData);

  const handleClose = () => {
    resetAddState();
    update({ editPhotoId: null });
  };

  if (!isOpen || !editPhotoId) return null;

  return (
    <PhotoEditSessionProvider key={editPhotoId} photoId={editPhotoId} onSuccess={handleClose}>
      <Modal open={isOpen} onClose={handleClose} size="screen" hidePadding showCloseButton={false}>
        <div className="flex flex-col h-full w-full bg-slate-50 focus:outline-none">
          <ModalHeader onClose={handleClose} onDeleteClick={deleteDialog.toggle} />

          <DeletePhotoDialog
            open={isDeleteOpen}
            onOpenChange={deleteDialog.toggle}
            lang={appLang}
            onDelete={async () => {
              if (editPhotoId) {
                try {
                  await deletePhoto([editPhotoId]);
                  handleClose();
                } catch (err) {}
              }
            }}
          />

          <div className="flex-1 overflow-hidden flex flex-col pt-2 min-h-0 w-full">
            <PhotoEditTabs 
              editPhotoId={editPhotoId}
              appLang={appLang}
            />
          </div>
        </div>
      </Modal>
    </PhotoEditSessionProvider>
  );
}
