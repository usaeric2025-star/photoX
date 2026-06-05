import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, LogIn, LogOut, Database, Globe } from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth, useAdminMode } from '@/hooks';
import { reportError } from '@/lib/errorReporter';
import { TranslationType } from '@/types';

interface ToolsMenuProps {
  show: boolean;
  t: TranslationType;
  handleOpenSettings: () => void;
  handleExitStaffMode?: () => void;
  currentLang: string;
  onSetLang: (l: string) => void;
}

export function ToolsMenu({ 
  show, t, handleOpenSettings, handleExitStaffMode, currentLang, onSetLang
}: ToolsMenuProps) {
  const { user, loginWithGoogle, logout } = useAuth();
  const hasAdminAccess = useAdminMode();
  
  const [isLogoutOpen, logoutDialog] = useDisclosure(false);
  const [isExitStaffOpen, exitStaffDialog] = useDisclosure(false);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[120]"
        >
          
          {(user || hasAdminAccess) && (
            <button 
              onClick={handleOpenSettings}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left font-semibold"
            >
              <Settings2 size={16} /> <span className="text-xs font-bold uppercase">{t.systemSettings}</span>
            </button>
          )}

          {user ? (
            <button 
              onClick={logoutDialog.open}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-red-650 transition-colors text-left"
            >
              <LogOut size={16} /> <span className="text-xs font-bold uppercase">管理员登出 / Log Out</span>
            </button>
          ) : (
            <button 
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (e: any) {
                  reportError(e, '管理员登录', 'warn');
                }
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-blue-600 transition-colors text-left"
            >
              <LogIn size={16} /> <span className="text-xs font-bold uppercase">管理员登录 / Admin Login</span>
            </button>
          )}

          {hasAdminAccess && (
            <button 
              onClick={exitStaffDialog.open}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left text-red-600 border-t border-slate-100"
            >
              <LogIn size={16} /> <span className="text-xs font-bold uppercase">{t.exitStaffMode}</span>
            </button>
          )}

          <ConfirmDialog
            open={isLogoutOpen}
            onOpenChange={logoutDialog.toggle}
            title="确认登出 / Confirm Logout"
            description="确定要登出管理员模式吗？ / Are you sure you want to log out?"
            onConfirm={async () => {
                await logout();
                window.location.reload();
            }}
            confirmText="登出"
            variant="destructive"
          />

          <ConfirmDialog
            open={isExitStaffOpen}
            onOpenChange={exitStaffDialog.toggle}
            title="确认退出员工模式 / Confirm Exit Staff Mode"
            description="确定要退出员工模式吗？ / Are you sure you want to exit staff mode?"
            onConfirm={() => {
                if (handleExitStaffMode) handleExitStaffMode();
            }}
            confirmText="退出"
            variant="destructive"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
