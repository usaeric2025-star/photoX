import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '../../styles/buttonStyles';
import { usePermission } from '../../hooks';
import { useAppRouter } from '@/lib/router';
import { useSignal } from '@/lib/store';
import { batchModeSignal } from '@/lib/store';

interface UploadButtonProps {
  onAdd?: () => void;
}

export function UploadButton({
  onAdd
}: UploadButtonProps) {
  const { can } = usePermission();
  const { route } = useAppRouter();
  const isManagement = typeof route?.name === 'string' && route?.name?.startsWith('admin');
  const isMultiSelect = useSignal(batchModeSignal);

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
