import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, LogIn, LogOut, Database } from 'lucide-react';
import { useAuth } from '@/hooks';
import { reportError } from '@/lib/errorReporter';
import { useGalleryStore } from '@/store';
import { triggerR2Migration, testR2ConnectionStatus } from '@/utils/migrateHelper';

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
  const { user, loginWithGoogle, logout } = useAuth();
  
  const handleMigrate = () => {
    triggerR2Migration();
  };

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
              onClick={() => {
                testR2ConnectionStatus();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left text-blue-600"
            >
              <Database size={16} /> <span className="text-xs font-bold uppercase">R2 诊断 / DIAGNOSTIC</span>
            </button>
          )}

          {isStaff && (
            <button 
              onClick={handleMigrate}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left text-blue-600"
            >
              <Database size={16} /> <span className="text-xs font-bold uppercase">R2 迁移</span>
            </button>
          )}
          
          {user ? (
            <button 
              onClick={() => {
                useGalleryStore.getState().setAlertDialog({
                    title: '确认登出 / Confirm Logout',
                    message: '确定要登出管理员模式吗？ / Are you sure you want to log out?',
                    onConfirm: async () => {
                        await logout();
                        window.location.reload();
                    },
                    type: 'danger'
                });
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-red-650 transition-colors text-left"
            >
              <LogOut size={16} /> <span className="text-xs font-bold uppercase">管理员登出 / Log Out</span>
            </button>
          ) : (
            <button 
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (e) {
                  reportError(e, '管理员登录', 'warn');
                }
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-blue-600 transition-colors text-left"
            >
              <LogIn size={16} /> <span className="text-xs font-bold uppercase">管理员登录 / Admin Login</span>
            </button>
          )}

          {isStaff && (
            <button 
              onClick={() => {
                useGalleryStore.getState().setAlertDialog({
                    title: '确认退出员工模式 / Confirm Exit Staff Mode',
                    message: '确定要退出员工模式吗？ / Are you sure you want to exit staff mode?',
                    onConfirm: () => {
                        if (handleExitStaffMode) handleExitStaffMode();
                    },
                    type: 'danger'
                });
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left text-red-600 border-t border-slate-100"
            >
              <LogIn size={16} /> <span className="text-xs font-bold uppercase">{t.exitStaffMode}</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
