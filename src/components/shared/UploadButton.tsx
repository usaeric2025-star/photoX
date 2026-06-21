import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '../../styles/buttonStyles';
import { usePermission, useUIStore } from '../../hooks';

interface UploadButtonProps {
  onAdd?: () => void;
}

export function UploadButton({
  onAdd
}: UploadButtonProps) {
  const { can } = usePermission();
  const isManagement = window.location.pathname.startsWith('/admin');
  const isMultiSelect = useUIStore(s => s.isMultiSelect);

  if (!isManagement || !can('photo:edit') || !onAdd || isMultiSelect) return null;

  return (
    <button
      onClick={onAdd}
      type="button"
      className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-100 active:scale-95 animate-scale-in disabled:opacity-50`}
      title="Add Photo"
    >
      <Icon name="plus" size={28} />
    </button>
  );
}
