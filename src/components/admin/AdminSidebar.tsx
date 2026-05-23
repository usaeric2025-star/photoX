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
  LogIn
} from 'lucide-react';
import { useGalleryStore, useShallow } from '../../store';
import { useAdmin } from '../../contexts/AdminContext';

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
    settings, activeScreen, setActiveScreen, cloudCount, onRefresh 
  } = useAdmin();
  
  const { isStaffMode, appLang } = useGalleryStore(useShallow(s => ({
    isStaffMode: s.isStaffMode,
    appLang: s.appLang
  })));

  return (
    <aside className="w-72 bg-brand-bg border-r border-brand-navy/5 flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Logo Section */}
      <div className="p-6 border-b border-brand-navy/5">
        {settings?.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="h-12 w-auto object-contain rounded-xl"
            onClick={() => setActiveScreen('home')}
          />
        ) : (
          <h1 
            className="text-xl font-black tracking-tighter text-brand-navy italic"
            onClick={() => setActiveScreen('home')}
          >
            PhotoX <span className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-2 border border-brand-navy/10 rounded-full py-0.5 ml-1 not-italic">Admin</span>
          </h1>
        )}
      </div>

      {/* Nav Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
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
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-brand-navy/5 border-t border-brand-navy/5 space-y-4">
        {isStaffMode && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-900">
              <Wrench size={16} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {appLang === 'zh' ? '员工模式' : appLang === 'ms' ? 'Mod Staf' : 'Staff Mode'}
              </span>
            </div>
            <button 
              onClick={() => {
                useGalleryStore.getState().setIsStaffMode(false);
                sessionStorage.removeItem('isStaffMode');
                window.location.reload();
              }}
              className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/25"
            >
              <LogIn size={14} className="rotate-180" />
              {appLang === 'zh' ? '退出员工模式' : appLang === 'ms' ? 'Keluar Mod Staf' : 'Exit Staff Mode'}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-brand-navy/10 shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest">Version</p>
            <p className="text-[11px] font-bold text-brand-navy italic">PhotoX v1.0.4 <span className="not-italic opacity-30">PRO</span></p>
          </div>
          <button 
           onClick={onRefresh}
           className="w-8 h-8 rounded-xl bg-brand-navy text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-brand-navy/20"
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
