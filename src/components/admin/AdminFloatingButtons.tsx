import React from 'react';
import { Plus } from 'lucide-react';
import { MultiSelectToolbar } from './MultiSelectToolbar';
import { buttonStyles } from '../../styles/buttonStyles';

interface AdminFloatingButtonsProps {
  onAdd: () => void;
  isMultiSelect: boolean;
  selectedIds: string[];
  setIsMultiSelect: (m: boolean) => void;
  onBatchAiIdentify: () => void;
  onBatchEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
}

export const AdminFloatingButtons: React.FC<AdminFloatingButtonsProps> = ({
  onAdd,
  isMultiSelect,
  selectedIds,
  setIsMultiSelect,
  onBatchAiIdentify,
  onBatchEdit,
  onGroup,
  onDelete,
  onToggleVisibility,
}) => {
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
          onClose={() => setIsMultiSelect(false)}
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
