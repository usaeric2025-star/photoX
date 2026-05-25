import React from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MultiSelectToolbar } from './MultiSelectToolbar';
import { buttonStyles } from '../../styles/buttonStyles';
import { useMultiSelect, usePermission } from '../../hooks';
import { Photo } from '../../types';

interface AdminFloatingButtonsProps {
  photos: Photo[];
  onAdd: () => void;
  onBatchAiIdentify: () => void;
  onBatchEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
  onClearSelection?: () => void;
}

export const AdminFloatingButtons: React.FC<AdminFloatingButtonsProps> = ({
  photos = [],
  onAdd,
  onBatchAiIdentify,
  onBatchEdit,
  onGroup,
  onDelete,
  onToggleVisibility,
  onClearSelection,
}) => {
  const { isMultiSelect, selectedIds } = useMultiSelect();
  const { canEdit } = usePermission();

  if (!canEdit) return null;

  return (
    <>
      <AnimatePresence>
        {isMultiSelect && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500]"
          >
            <MultiSelectToolbar
              selectedCount={selectedIds.length}
              onClose={onClearSelection || (() => {})}
              onDelete={onDelete}
              onBatchAiIdentify={onBatchAiIdentify}
              onGroup={onGroup}
              onBatchEdit={onBatchEdit}
              onToggleVisibility={onToggleVisibility}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isMultiSelect && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onAdd}
          className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 z-[100] rounded-full shadow-lg hover:shadow-xl transition-shadow`}
          title="Add Photo"
        >
          <Plus size={28} />
        </motion.button>
      )}
    </>
  );
};
