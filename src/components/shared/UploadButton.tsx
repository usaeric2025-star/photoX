import React from 'react';
import { Icon } from '#src/components/ui/Icon';
import { buttonStyles } from '#src/styles/buttonStyles';
import { usePermission } from '#src/hooks';
import { useAppRouter } from '#lib/router';
import { useIsMultiSelect } from '#src/features/selection';

interface UploadButtonProps {
  onAdd?: () => void;
}

export function UploadButton({
  onAdd
}: UploadButtonProps) {
  const { can } = usePermission();
  const { route } = useAppRouter();
  const isManagement = typeof route?.name === 'string' && route?.name?.startsWith('admin');
  const isMultiSelect = useIsMultiSelect();
  const isBatch = isMultiSelect;

  if (!isManagement || !can('photo:edit') || !onAdd || isBatch) return null;

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
