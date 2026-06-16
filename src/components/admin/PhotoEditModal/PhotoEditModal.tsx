import React from "react";
import { PhotoEditSessionProvider } from '@/hooks/photo/PhotoEditSessionProvider';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { HeadlessSlot } from "@/lib/component-contract";
import { Modal } from "@/components/ui/Modal";
import { ModalHeader } from "./ModalHeader";
import { DeletePhotoDialog } from "./DeletePhotoDialog";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { useUIStore } from "@/store";
import { 
  usePhotoDelete,
  useFilters,
} from "@/hooks";

/**
 * [V2.14-SLOT-CONTRACT] PhotoEditModal Sub-component to handle loading state
 */
interface PhotoEditModalContentProps {
  editPhotoId?: string | null;
  appLang: string;
  handleClose: () => void;
  isDeleteOpen: boolean;
  deleteDialog: { toggle: () => void; close: () => void; open: () => void };
  deletePhoto: (ids: string[]) => Promise<void>;
}

function PhotoEditModalContent({ editPhotoId, appLang, handleClose, isDeleteOpen, deleteDialog, deletePhoto }: PhotoEditModalContentProps) {
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
  const { modal, photoId, setModal, setPhotoId } = useFilters();
  const urlEditPhotoId = modal === 'edit' ? photoId : null;
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);

  const { mutateAsync: deletePhoto } = usePhotoDelete();

  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  const resetAddState = () => update({ newPhotoData: null });

  // Fallback to store if props not provided, preferring URL
  const editPhotoId = propEditPhotoId !== undefined ? propEditPhotoId : urlEditPhotoId;
  const isOpen = propIsOpen !== undefined ? propIsOpen : !!(editPhotoId || newPhotoData);

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      resetAddState();
      if (modal === 'edit') {
        setModal(null);
        setPhotoId(null);
      }
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
