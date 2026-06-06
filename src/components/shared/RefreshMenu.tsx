import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, FileText } from 'lucide-react';
import { TranslationType } from '../../types';

interface RefreshMenuProps {
  show: boolean;
  isInfiniteMode: boolean;
  t: TranslationType;
  toggleInfinite: () => void;
}

export function RefreshMenu({ show, isInfiniteMode, t, toggleInfinite }: RefreshMenuProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-brand-navy/10 overflow-hidden z-[var(--z-index-dropdown)]"
        >
          <button 
            onClick={toggleInfinite}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-brand-navy/5 transition-colors text-left"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isInfiniteMode ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {isInfiniteMode ? <CheckCircle2 size={16} /> : <FileText size={16} />}
            </div>
            <div>
              <div className="text-[11px] font-black text-brand-navy uppercase tracking-wide">
                {isInfiniteMode ? t.infiniteEnabled : t.enableInfinite}
              </div>
              <div className="text-[9px] text-brand-navy/40 font-medium leading-none mt-1">
                {isInfiniteMode ? t.showAllPhotos : t.lazyLoading}
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
