import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, LogIn } from 'lucide-react';

interface ToolsMenuProps {
  show: boolean;
  t: any;
  handleOpenSettings: () => void;
  handleExitStaffMode?: () => void;
  isStaff: boolean;
  currentLang: string;
  onSetLang: (l: string) => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ 
  show, t, handleOpenSettings, handleExitStaffMode, isStaff, currentLang, onSetLang 
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[120]"
        >
          <div className="p-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Language</span>
             <div className="flex gap-1">
                {['en', 'zh', 'ms'].map(l => (
                  <button
                    key={l}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetLang(l);
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                      currentLang === l 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200' 
                    }`}
                  >
                    {l === 'en' ? 'EN' : l === 'zh' ? 'ZH' : 'MS'}
                  </button>
                ))}
             </div>
          </div>
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
