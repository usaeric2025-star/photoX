import React from "react";
import { PhotoEditSessionProvider } from '@/hooks/photo/PhotoEditSessionProvider';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { HeadlessSlot } from "@/lib/component-contract";
import { Modal } from "@/components/ui/Modal";
import { ModalHeader } from "./ModalHeader";
import { DeletePhotoDialog } from "../PhotoEditDrawer/DeletePhotoDialog";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { LoadingPulse } from "@/components/ui/LoadingPulse";
import { useUIStore } from "@/store";
import { 
  usePhotoDelete,
} from "@/hooks";

/**
 * [V2.14-SLOT-CONTRACT] PhotoEditModal Sub-component to handle loading state
 */
function PhotoEditModalContent({ editPhotoId, appLang, handleClose, isDeleteOpen, deleteDialog, deletePhoto }: any) {
  // We need to consume context if we want to show loading from provider, but 
  // PhotoEditModal is the parent of the provider? No, it's a sibling of children.
  // Actually children of provider can see the context.
  return (
    <div className="flex flex-col h-full w-full bg-slate-50 focus:outline-none relative">
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
  );
}

interface PhotoEditModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  editPhotoId?: string | null;
  slots?: {
    modalHeader?: HeadlessSlot<any>;
    tabs?: HeadlessSlot<any>;
  };
}

export function PhotoEditModal({ slots, isOpen: propIsOpen, onClose: propOnClose, editPhotoId: propEditPhotoId }: PhotoEditModalProps) {
  const storeEditPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const { mutateAsync: deletePhoto } = usePhotoDelete();

  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  const resetAddState = () => update({ newPhotoData: null });

  // Fallback to store if props not provided
  const editPhotoId = propEditPhotoId !== undefined ? propEditPhotoId : storeEditPhotoId;
  const isOpen = propIsOpen !== undefined ? propIsOpen : !!(editPhotoId || newPhotoData);

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      resetAddState();
      update({ editPhotoId: null });
    }
  };

  if (!isOpen) return null;

  // Render for either editing an existing photo or creating a new one
  const targetId = editPhotoId || "new";

  return (
    <PhotoEditSessionProvider key={targetId} photoId={editPhotoId || ''} onSuccess={handleClose}>
      <Modal open={isOpen} onClose={handleClose} size="screen" hidePadding showCloseButton={false}>
        <PhotoEditModalContent 
          editPhotoId={editPhotoId}
          appLang={appLang}
          handleClose={handleClose}
          isDeleteOpen={isDeleteOpen}
          deleteDialog={deleteDialog}
          deletePhoto={deletePhoto}
        />
      </Modal>
    </PhotoEditSessionProvider>
  );
}
