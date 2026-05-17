import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, LogIn } from 'lucide-react';

interface ToolsMenuProps {
  show: boolean;
  t: any;
  handleOpenSettings: () => void;
  handleExitStaffMode?: () => void;
  isStaff: boolean;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ show, t, handleOpenSettings, handleExitStaffMode, isStaff }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[120]"
        >
          <button 
            onClick={handleOpenSettings}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <Settings2 size={16} /> <span className="text-xs font-bold uppercase">{t.systemSettings}</span>
          </button>
          {isStaff && (
            <button 
              onClick={handleExitStaffMode}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left text-red-600"
            >
              <LogIn size={16} /> <span className="text-xs font-bold uppercase">{t.exitStaffMode}</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
