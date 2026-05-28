import React from 'react';
import { Plus, ArrowUpToLine, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MultiSelectToolbar } from '../admin/MultiSelectToolbar';
import { buttonStyles } from '../../styles/buttonStyles';
import { useMultiSelect, usePermission } from '../../hooks';
import { Photo } from '../../types';
import { GalleryVariant } from '@/types/variant';

interface FloatingActionsProps {
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

export const FloatingActions: React.FC<FloatingActionsProps> = ({
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
}) => {
  const { isMultiSelect, selectedIds } = useMultiSelect();
  const { can } = usePermission();
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';

  if (isManagement) {
    if (!can('photo:edit')) return null;

    return (
      <>
        <AnimatePresence>
          {isMultiSelect && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-6 left-0 right-0 flex justify-center z-[500]"
            >
              <MultiSelectToolbar
                selectedCount={selectedIds.length}
                onClose={onClearSelection || (() => {})}
                onDelete={onDelete || (() => {})}
                onBatchAiIdentify={onBatchAiIdentify || (() => {})}
                onGroup={onGroup || (() => {})}
                onBatchEdit={onBatchEdit || (() => {})}
                onToggleVisibility={onToggleVisibility}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isMultiSelect && onAdd && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            onClick={onAdd}
            className={`${buttonStyles.button} bg-blue-600 fixed bottom-6 right-6 z-[100] rounded-full shadow-lg hover:shadow-xl transition-shadow`}
            title="Add Photo"
          >
            <Plus size={28} />
          </motion.button>
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
