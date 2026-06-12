import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonStyles } from '../../styles/buttonStyles';
import { usePermission } from '../../hooks';

interface UploadButtonProps {
  onAdd?: () => void;
}

export function UploadButton({
  onAdd
}: UploadButtonProps) {
  const { can } = usePermission();
  const isManagement = window.location.pathname.startsWith('/admin');

  if (!isManagement || !can('photo:edit') || !onAdd) return null;

  return (
    <button
      onClick={onAdd}
      type="button"
      className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 z-[40] rounded-full shadow-lg hover:shadow-xl transition-all duration-100 active:scale-95 animate-scale-in disabled:opacity-50`}
      title="Add Photo"
    >
      <Plus size={28} />
    </button>
  );
}
