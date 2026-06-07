import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonStyles } from '../../styles/buttonStyles';
import { usePermission } from '../../hooks';
import { GalleryVariant } from '@/types/variant';

interface UploadButtonProps {
  variant: GalleryVariant;
  onAdd?: () => void;
}

export function UploadButton({
  variant,
  onAdd
}: UploadButtonProps) {
  const { can } = usePermission();
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';

  if (!isManagement || !can('photo:edit') || !onAdd) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      onClick={onAdd}
      type="button"
      className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 z-[40] rounded-full shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50`}
      title="Add Photo"
    >
      <Plus size={28} />
    </motion.button>
  );
}
