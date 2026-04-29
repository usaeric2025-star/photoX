import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onClick: () => void;
  title?: string;
}

export const FloatingActionButton: React.FC<Props> = ({ onClick, title = 'Add Photo' }) => {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-20 right-5 z-[100] w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20 active:bg-blue-700 transition-colors"
      title={title}
      id="admin-fab-add"
    >
      <Plus size={28} />
    </motion.button>
  );
};
