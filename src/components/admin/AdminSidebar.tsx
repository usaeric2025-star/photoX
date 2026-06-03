import React from 'react';
import { 
  BarChart3, 
  Settings2, 
  Tag, 
  Layers, 
  Terminal,
  Home,
  Sparkles,
  Wrench,
  LogIn,
  Plus,
  Cloud,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { reportError } from '@/lib/errorReporter';
import { useAuth, usePermission, useSettings, useSyncMutation, useAdminMode } from '@/hooks';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
  collapsed?: boolean;
}

function SidebarItem({ icon: Icon, label, active, onClick, badge, collapsed }: SidebarItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 rounded-2xl transition-all group ${
        active 
          ? 'bg-brand-navy text-white shadow-lg' 
          : 'text-brand-navy/60 hover:bg-brand-navy/5 hover:text-brand-navy'
      } ${collapsed ? 'px-0 justify-center' : 'px-4'}`}
      title={collapsed ? label : undefined}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className={`p-1 rounded-lg ${active ? 'bg-white/10' : 'group-hover:bg-brand-navy/5'}`}>
          <Icon size={18} />
        </div>
        {!collapsed && <span className="text-[13px] font-semibold tracking-tight">{label}</span>}
      </div>
      {!collapsed && badge !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          active ? 'bg-white/20 text-white' : 'bg-brand-navy/10 text-brand-navy'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function AdminSidebar() {
  const activeScreen = useUIStore((s) => s.activeScreen);
  const update = useUIStore((s) => s.update);
  const appLang = useUIStore((s) => s.appLang);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  
  const { can } = usePermission();
  const hasAdminAccess = useAdminMode();
  const { settings } = useSettings();
  const { mutateAsync: syncMut } = useSyncMutation();

  const handleImport = () => {
    update({ activeScreen: 'home' });
    setTimeout(() => {
      document.getElementById('admin-quick-add-input')?.click();
    }, 150);
  };

  const onRefresh = () => {
    syncMut('pull');
  };

  const { user, loginWithGoogle, logout } = useAuth();
  const isEffectiveStaffMode = hasAdminAccess && !user;

  return (
    <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-brand-bg border-r border-brand-navy/5 flex flex-col h-screen sticky top-0 overflow-hidden transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => update({ isSidebarCollapsed: !isSidebarCollapsed })}
        className="absolute top-6 -right-3 z-50 bg-white border border-brand-navy/10 rounded-full p-1 shadow-sm text-brand-navy hover:bg-brand-navy/5"
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Section */}
      <div className={`p-6 border-b border-brand-navy/5 flex items-center ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}>
        {settings?.logo_url && settings.logo_url.trim() !== '' ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className={`${isSidebarCollapsed ? 'h-8' : 'h-12'} w-auto object-contain rounded-xl cursor-pointer transition-all`}
            onClick={() => update({ activeScreen: 'home' })}
            title="PhotoX Admin"
          />
        ) : (
          <h1 
            className={`text-xl font-black tracking-tighter text-brand-navy italic cursor-pointer ${isSidebarCollapsed ? 'text-sm' : ''}`}
            onClick={() => update({ activeScreen: 'home' })}
            title="PhotoX Admin"
          >
            {isSidebarCollapsed ? 'PX' : 'PhotoX'} {!isSidebarCollapsed && <span className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-2 border border-brand-navy/10 rounded-full py-0.5 ml-1 not-italic">Admin</span>}
          </h1>
        )}
      </div>

      {/* Nav Section */}
      <div className={`flex-1 overflow-y-auto ${isSidebarCollapsed ? 'p-2' : 'p-4'} space-y-6 no-scrollbar`}>
        {/* Primary Action */}
        <div className="px-2">
           <button 
             onClick={handleImport}
             className={`w-full flex items-center justify-center gap-2 py-3 ${isSidebarCollapsed ? 'px-0' : 'px-4'} bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md transition-all active:scale-95`}
             title="添加/导入照片"
           >
             <Plus size={18} />
             {!isSidebarCollapsed && <span className="text-sm font-bold tracking-wide">添加/导入照片</span>}
           </button>
        </div>

        <div className="space-y-1">
          {!isSidebarCollapsed && <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-[0.2em] px-4 mb-2">主控台 / Dashboard</p>}
          <SidebarItem 
            icon={BarChart3} 
            label="仪表盘 / Dashboard" 
            collapsed={isSidebarCollapsed}
            active={activeScreen === 'dashboard'} 
            onClick={() => {
              update({ activeScreen: 'dashboard' });
            }} 
          />
          <SidebarItem 
            icon={Home} 
            label="照片库 / Gallery" 
            collapsed={isSidebarCollapsed}
            active={activeScreen === 'home'} 
            onClick={() => {
              update({ activeScreen: 'home' });
            }} 
          />
        </div>

        <div className="space-y-1">
          {!isSidebarCollapsed && <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-[0.2em] px-4 mb-2">管理与优化 / Management</p>}
          {can('photo:edit') && (
            <SidebarItem 
              icon={Cloud} 
              label="云端存储管理" 
              collapsed={isSidebarCollapsed}
              active={activeScreen === 'manage'} 
              onClick={() => update({ activeScreen: 'manage' })}
            />
          )}
          {can('photo:edit') && (
            <SidebarItem 
              icon={Sparkles} 
              label="AI 智能配置" 
              collapsed={isSidebarCollapsed}
              active={activeScreen === 'ai_settings'} 
              onClick={() => update({ activeScreen: 'ai_settings' })}
            />
          )}
          {can('photo:edit') && (
            <SidebarItem 
              icon={Layers} 
              label="分类 / 厂商管理" 
              collapsed={isSidebarCollapsed}
              active={activeScreen === 'structure'} 
              onClick={() => update({ activeScreen: 'structure' })}
            />
          )}
          {can('photo:edit') && (
            <SidebarItem 
              icon={Tag} 
              label="标签管理" 
              collapsed={isSidebarCollapsed}
              active={activeScreen === 'tags'} 
              onClick={() => update({ activeScreen: 'tags' })}
            />
          )}
        </div>

        {can('admin:dashboard:access') && (
          <div className="space-y-1">
            {!isSidebarCollapsed && <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-[0.2em] px-4 mb-2">系统 / System</p>}
            <SidebarItem 
              icon={Wrench} 
              label="系统设置与维护" 
              collapsed={isSidebarCollapsed}
              active={activeScreen === 'settings'} 
              onClick={() => update({ activeScreen: 'settings' })}
            />
            <SidebarItem 
              icon={Terminal} 
              label="系统日志" 
              collapsed={isSidebarCollapsed}
              active={activeScreen === 'logs'} 
              onClick={() => update({ activeScreen: 'logs' })}
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className={`p-4 bg-brand-navy/5 border-t border-brand-navy/5 space-y-3 shrink-0 ${isSidebarCollapsed ? 'p-2 flex flex-col items-center' : ''}`}>
        {isEffectiveStaffMode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2 text-amber-900">
                <Wrench size={14} className="animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {appLang === 'zh' ? '员工模式' : appLang === 'ms' ? 'Mod Staf' : 'Staff Mode'}
                </span>
              </div>
            )}
            <button 
              onClick={() => {
                window.location.reload();
              }}
              className={`w-full py-2 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/25 ${isSidebarCollapsed ? 'px-0' : ''}`}
              title="退出 / Exit"
            >
              <LogIn size={12} className="rotate-180" />
              {!isSidebarCollapsed && (appLang === 'zh' ? '退出员工模式' : appLang === 'ms' ? 'Keluar Mod Staf' : 'Exit Staff Mode')}
            </button>
          </div>
        )}

        {/* Account Auth Card */}
        {user ? (
          <div className={`flex flex-col gap-2.5 bg-white p-3 rounded-2xl border border-brand-navy/10 shadow-sm ${isSidebarCollapsed ? 'p-1.5' : ''}`}>
            <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              {user.photo_url || user.avatar_url ? (
                <img 
                  src={user.photo_url || user.avatar_url || ''} 
                  className="w-8 h-8 rounded-full border border-brand-navy/10 object-cover" 
                  referrerPolicy="no-referrer" 
                  alt="Avatar" 
                  title={user.display_name || ''}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy font-black flex items-center justify-center text-[10px] uppercase" title={user.display_name || ''}>
                  {user.display_name?.substring(0, 2) || 'AD'}
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-brand-navy truncate leading-tight">{user.display_name}</p>
                  <p className="text-[8px] font-bold text-green-600 uppercase tracking-widest leading-none">Admin Mode</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button 
                onClick={async () => {
                  await logout();
                  window.location.reload();
                }}
                className="w-full py-1.5 px-2 bg-slate-900 border border-slate-950 hover:bg-slate-800 active:scale-[0.97] text-white font-bold text-[9px] uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                登出账号 / Log Out
              </button>
            )}
          </div>
        ) : (
          <div className={`flex flex-col gap-2 bg-white rounded-2xl border border-brand-navy/10 shadow-sm ${isSidebarCollapsed ? 'p-1.5 items-center' : 'p-3'}`}>
            {!isSidebarCollapsed && <p className="text-[8px] font-bold text-brand-navy/30 uppercase tracking-widest leading-none text-center">Not Authed (Read-Only)</p>}
            <button 
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (e: any) {
                  reportError(e, '侧边栏登录', 'warn');
                }
              }}
              title="Admin Login"
              className={`w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white font-bold text-[9px] uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 ${isSidebarCollapsed ? 'px-0 py-2' : ''}`}
            >
              <LogIn size={isSidebarCollapsed ? 14 : 12} />
              {!isSidebarCollapsed && "管理员登录 / Admin Login"}
            </button>
          </div>
        )}

        <div className={`flex items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-brand-navy/10 shadow-sm ${isSidebarCollapsed ? 'justify-center p-1.5' : ''}`}>
          {!isSidebarCollapsed && (
            <div className="space-y-0.5">
              <p className="text-[8px] font-bold text-brand-navy/40 uppercase tracking-widest">Version</p>
              <p className="text-[10px] font-bold text-brand-navy italic">PhotoX v1.0.4 <span className="not-italic opacity-30">PRO</span></p>
            </div>
          )}
          <button 
           onClick={onRefresh}
           title="Settings"
           className="w-7 h-7 rounded-lg bg-brand-navy text-white flex items-center justify-center active:scale-95 transition-transform shadow-md"
          >
            <Settings2 size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
;
