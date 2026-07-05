import React, { useState } from 'react';
import { useAppRouter } from '#lib/router/index.js';
import { useTranslation, usePermission } from '#src/hooks/index.js';
import { SidebarItem } from './SidebarItem.js';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { activeTaskCountSignal } from '#lib/store/index.js';
import { useComputed } from '@preact/signals-react';
import { useLocation } from 'wouter';

export function AdminSidebar() {
  const { navigate } = useAppRouter();
  const [location] = useLocation();
  const { t } = useTranslation();
  const { isAdmin } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const taskCount = useComputed(() => activeTaskCountSignal.value).value;

  const currentPath = location;

  const menuItems = [
    { 
      id: 'gallery', 
      icon: 'image', 
      label: t('allPhotos'), 
      active: currentPath === '/admin' || currentPath.startsWith('/admin/group/'),
      onClick: () => navigate.admin() 
    },
    { 
      id: 'batch', 
      icon: 'layers', 
      label: t('batchOperation'), 
      active: currentPath.startsWith('/admin/batch'),
      onClick: () => navigate.adminBatchEdit() 
    },
    { 
      id: 'diagnose', 
      icon: 'activity', 
      label: t('diagnostics'), 
      active: currentPath.startsWith('/admin/diagnose') || currentPath.startsWith('/diagnostics'),
      onClick: () => navigate.diagnostics() 
    },
    { 
      id: 'settings', 
      icon: 'settings', 
      label: t('settings'), 
      active: currentPath.startsWith('/settings'),
      onClick: () => navigate.settings() 
    }
  ];

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 relative z-40 shadow-sm",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-lg">X</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-slate-900 tracking-tight text-lg animate-in fade-in slide-in-from-left-2">PhotoX</span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 flex flex-col gap-1 no-scrollbar">
        {!collapsed && (
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Dashboard
          </div>
        )}
        {menuItems.map(item => (
          <SidebarItem
            key={item.id}
            {...item}
            collapsed={collapsed}
          />
        ))}

        {taskCount > 0 && (
          <SidebarItem
            icon="loader"
            label={t('activeTasks') || 'Tasks'}
            active={false}
            badge={taskCount}
            collapsed={collapsed}
            className="animate-pulse"
          />
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-100">
        <SidebarItem
          icon="home"
          label={t('backToHome')}
          onClick={() => navigate.home()}
          collapsed={collapsed}
        />
      </div>

      {/* Collapse Toggle - Floating style */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all z-20 group"
        title={collapsed ? "Expand" : "Collapse"}
      >
        <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
      </button>
    </aside>
  );
}
