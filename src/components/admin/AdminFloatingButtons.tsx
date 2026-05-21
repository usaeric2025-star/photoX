import React from 'react';
import { Plus } from 'lucide-react';
import { MultiSelectToolbar } from './MultiSelectToolbar';
import { buttonStyles } from '../../styles/buttonStyles';
import { useMultiSelect } from '../../hooks';

interface AdminFloatingButtonsProps {
  onAdd: () => void;
  onBatchAiIdentify: () => void;
  onBatchEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
  onClearSelection?: () => void;
}

export const AdminFloatingButtons: React.FC<AdminFloatingButtonsProps> = ({
  onAdd,
  onBatchAiIdentify,
  onBatchEdit,
  onGroup,
  onDelete,
  onToggleVisibility,
  onClearSelection,
}) => {
  const { isMultiSelect, selectedIds, disable } = useMultiSelect();

  return (
    <>
      {!isMultiSelect && (
        <button
          onClick={onAdd}
          className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 z-[100] rounded-full`}
          title="Add Photo"
        >
          <Plus size={28} />
        </button>
      )}

      {isMultiSelect && selectedIds.length > 0 && (
        <MultiSelectToolbar
          selectedCount={selectedIds.length}
          onClose={() => {
            disable();
            if (onClearSelection) onClearSelection();
          }}
          onBatchAiIdentify={onBatchAiIdentify}
          onBatchEdit={onBatchEdit}
          onGroup={onGroup}
          onDelete={onDelete}
          onToggleVisibility={onToggleVisibility}
        />
      )}
    </>
  );
};
