import React from 'react';
import { Plus, ArrowUpToLine, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonStyles } from '../../styles/buttonStyles';
import { useMultiSelect, usePermission } from '../../hooks';
import { Photo } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { useFormStatus } from 'react-dom';

function AddButton({ onAdd }: { onAdd: () => void }) {
  const { pending } = useFormStatus();
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      type="submit"
      disabled={pending}
      className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 z-[100] rounded-full shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50`}
      title="Add Photo"
    >
      <Plus size={28} />
    </motion.button>
  );
}

interface UploadButtonProps {
  variant: GalleryVariant;
  photos?: Photo[];
  onAdd?: () => void;
  onBatchAiIdentify?: () => void;
  onBatchEdit?: () => void;
  onGroup?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  onClearSelection?: () => void;
  scrollToTop?: () => void;
  contactWhatsApp?: () => void;
}

export function UploadButton({
  variant,
  onAdd,
  onBatchAiIdentify,
  onBatchEdit,
  onGroup,
  onDelete,
  onToggleVisibility,
  onClearSelection,
  scrollToTop,
  contactWhatsApp,
}: UploadButtonProps) {
  const { isMultiSelect } = useMultiSelect();
  const { can } = usePermission();
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';

  if (isManagement) {
    if (!can('photo:edit')) return null;

    return (
      <>
        {!isMultiSelect && onAdd && (
          <form action={onAdd}>
            <AddButton onAdd={onAdd} />
          </form>
        )}
      </>
    );
  }

  // Public Variant
  return (
    <div className={buttonStyles.container}>
      {scrollToTop && (
        <button 
          onClick={scrollToTop} 
          className={`${buttonStyles.button} bg-brand-navy`}
          title="Scroll to Top"
        >
          <ArrowUpToLine size={20} />
        </button>
      )}
      {contactWhatsApp && (
        <button 
          onClick={contactWhatsApp} 
          className={`${buttonStyles.button} bg-[#25D366]`}
          title="Contact WhatsApp"
        >
          <MessageCircle size={20} />
        </button>
      )}
    </div>
  );
};
