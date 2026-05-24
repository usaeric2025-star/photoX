import React from 'react';
import { 
  BarChart3, 
  Settings2, 
  Cloud, 
  Tag, 
  Layers, 
  Terminal,
  Home,
  Monitor,
  Sparkles,
  Wrench,
  LogIn,
  Plus
} from 'lucide-react';
import { useGalleryStore, useShallow } from '../../store';
import { useAdmin } from '../../contexts/AdminContext';
import { useAuth } from '../../hooks';
import { reportError } from '@/lib/errorReporter';
import { triggerR2Migration } from '@/utils/migrateHelper';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${
      active 
        ? 'bg-brand-navy text-white shadow-lg' 
        : 'text-brand-navy/60 hover:bg-brand-navy/5 hover:text-brand-navy'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-1 rounded-lg ${active ? 'bg-white/10' : 'group-hover:bg-brand-navy/5'}`}>
        <Icon size={18} />
      </div>
      <span className="text-[13px] font-semibold tracking-tight">{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-brand-navy/10 text-brand-navy'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

export const AdminSidebar: React.FC = () => {
  const { 
    settings, activeScreen, setActiveScreen, cloudCount, onRefresh, handleImport 
  } = useAdmin();
  
  const { isStaffMode, appLang } = useGalleryStore(useShallow(s => ({
    isStaffMode: s.isStaffMode,
    appLang: s.appLang
  })));

  const { user, loginWithGoogle, logout } = useAuth();

  return (
    <aside className="w-72 bg-brand-bg border-r border-brand-navy/5 flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Logo Section */}
      <div className="p-6 border-b border-brand-navy/5">
        {settings?.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="h-12 w-auto object-contain rounded-xl cursor-pointer"
            onClick={() => setActiveScreen('home')}
          />
        ) : (
          <h1 
            className="text-xl font-black tracking-tighter text-brand-navy italic cursor-pointer"
            onClick={() => setActiveScreen('home')}
          >
            PhotoX <span className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-2 border border-brand-navy/10 rounded-full py-0.5 ml-1 not-italic">Admin</span>
          </h1>
        )}
      </div>

      {/* Nav Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* Primary Action */}
        <div className="px-2">
           <button 
             onClick={handleImport}
             className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md transition-all active:scale-95"
           >
             <Plus size={18} />
             <span className="text-sm font-bold tracking-wide">添加/导入照片</span>
           </button>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-[0.2em] px-4 mb-2">主控台 / Dashboard</p>
          <SidebarItem 
            icon={Home} 
            label="照片库" 
            active={activeScreen === 'home'} 
            onClick={() => {
              setActiveScreen('home');
            }} 
          />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-[0.2em] px-4 mb-2">管理与优化 / Management</p>
          <SidebarItem 
            icon={Cloud} 
            label="云端存储管理" 
            active={activeScreen === 'manage'} 
            onClick={() => setActiveScreen('manage')}
          />
          <SidebarItem 
            icon={Sparkles} 
            label="AI 智能配置" 
            active={activeScreen === 'ai_settings'} 
            onClick={() => setActiveScreen('manage')} // For now direct to settings
          />
          <SidebarItem 
            icon={Layers} 
            label="分类 / 厂商管理" 
            active={activeScreen === 'structure'} 
            onClick={() => setActiveScreen('manage')}
          />
          <SidebarItem 
            icon={Tag} 
            label="标签管理" 
            active={activeScreen === 'tags'} 
            onClick={() => setActiveScreen('manage')}
          />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-[0.2em] px-4 mb-2">系统 / System</p>
          <SidebarItem 
            icon={Wrench} 
            label="系统设置" 
            active={activeScreen === 'settings'} 
            onClick={() => setActiveScreen('settings')}
          />
          <SidebarItem 
            icon={Terminal} 
            label="系统日志" 
            active={activeScreen === 'logs'} 
            onClick={() => setActiveScreen('manage')}
          />
          <SidebarItem 
            icon={BarChart3} 
            label="云端统计" 
            active={false} 
            onClick={() => {}}
            badge={cloudCount || 0}
          />
          <button 
            onClick={() => {
              triggerR2Migration();
            }}
            className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-[10px] rounded-xl transition-all shadow-md mt-4"
          >
            🚨 临时 R2 数据与URL迁移
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-brand-navy/5 border-t border-brand-navy/5 space-y-3 shrink-0">
        {isStaffMode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900">
              <Wrench size={14} className="animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {appLang === 'zh' ? '员工模式' : appLang === 'ms' ? 'Mod Staf' : 'Staff Mode'}
              </span>
            </div>
            <button 
              onClick={() => {
                useGalleryStore.getState().setIsStaffMode(false);
                sessionStorage.removeItem('isStaffMode');
                window.location.reload();
              }}
              className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/25"
            >
              <LogIn size={12} className="rotate-180" />
              {appLang === 'zh' ? '退出员工模式' : appLang === 'ms' ? 'Keluar Mod Staf' : 'Exit Staff Mode'}
            </button>
          </div>
        )}

        {/* Account Auth Card */}
        {user ? (
          <div className="flex flex-col gap-2.5 bg-white p-3 rounded-2xl border border-brand-navy/10 shadow-sm">
            <div className="flex items-center gap-2.5">
              {user.photo_url || user.avatar_url ? (
                <img 
                  src={user.photo_url || user.avatar_url || ''} 
                  className="w-8 h-8 rounded-full border border-brand-navy/10 object-cover" 
                  referrerPolicy="no-referrer" 
                  alt="Avatar" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy font-black flex items-center justify-center text-[10px] uppercase">
                  {user.display_name?.substring(0, 2) || 'AD'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-brand-navy truncate leading-tight">{user.display_name}</p>
                <p className="text-[8px] font-bold text-green-600 uppercase tracking-widest leading-none">Admin Mode</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              className="w-full py-1.5 px-2 bg-slate-900 border border-slate-950 hover:bg-slate-800 active:scale-[0.97] text-white font-bold text-[9px] uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              登出账号 / Log Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-brand-navy/10 shadow-sm">
            <p className="text-[8px] font-bold text-brand-navy/30 uppercase tracking-widest leading-none text-center">Not Authed (Read-Only)</p>
            <button 
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (e) {
                  reportError(e, '侧边栏登录', 'warn');
                }
              }}
              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white font-bold text-[9px] uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
            >
              管理员登录 / Admin Login
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-brand-navy/10 shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[8px] font-bold text-brand-navy/40 uppercase tracking-widest">Version</p>
            <p className="text-[10px] font-bold text-brand-navy italic">PhotoX v1.0.4 <span className="not-italic opacity-30">PRO</span></p>
          </div>
          <button 
           onClick={onRefresh}
           className="w-7 h-7 rounded-lg bg-brand-navy text-white flex items-center justify-center active:scale-95 transition-transform shadow-md"
          >
            <Settings2 size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
};
