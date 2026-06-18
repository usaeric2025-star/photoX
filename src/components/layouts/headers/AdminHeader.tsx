import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React from 'react';
import { Camera } from 'lucide-react';
import { DynamicIcon } from '../../shared/DynamicIcon';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, useSettings, useAdminBatchActions, usePermission } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DropdownMenu } from '../../shared/Dropdown';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { translations } from "@/locales";
import { storage } from '@/services/storage';


interface AdminHeaderProps {}

export function AdminHeader({}: AdminHeaderProps) {
  const { handleBatchAiIdentifyTrigger: batchAiIdentifyRaw } = useAdminBatchActions();
  const handleBatchAiIdentifyTrigger = () => batchAiIdentifyRaw([]); // Passing empty allPhotos or we need to fix the contract
  const { user, signOut } = useAuthStore();
  const { settings } = useSettings();
  const { role } = usePermission();
  const navigate = useRouterSafe().navigate;

  const lang = useUIStore(s => s.appLang);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const { data: totalCountData } = useQuery({
    queryKey: ['photos', 'count', 'total'],
    queryFn: async () => {
      const res = await api.photos.count.$post({ json: { isAdminMode: true } });
      if (!res.ok) return 0;
      const json = await res.json();
      return json.data as number;
    },
    staleTime: 60 * 1000
  });
  const totalCount = totalCountData ?? 0;

  const [cachedLogoUrl, setCachedLogoUrl] = React.useState<string | null>(() => {
    try {
      const item = storage.getItem('photox_cached_settings');
      if (item) {
        const parsed = JSON.parse(item);
        return parsed.logo_url || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });


  const logoUrl = settings?.logo_url || cachedLogoUrl;

  const handleAuthAction = () => {
    navigate({ to: '/' });
  };

  // Admin header matching to PublicHeader
  const headerBgClass = "bg-white border-slate-200 text-slate-800";

  return (
    <header className={`h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-4 flex items-center justify-between font-sans transition-colors duration-300 relative ${headerBgClass}`}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0 flex-nowrap">
        {logoUrl && logoUrl.trim() !== '' ? (
          <img 
              src={logoUrl} 
              className="h-7 sm:h-9 w-auto object-contain shrink-0" 
              alt="Logo" 
              loading="lazy"
              onLoad={() => {
                if (settings?.logo_url && settings.logo_url !== cachedLogoUrl) {
                  setCachedLogoUrl(settings.logo_url);
                }
              }}
            />
          ) : (
            <div className="flex items-center gap-1 font-bold tracking-tighter">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm text-white shrink-0 ${role === 'admin' ? 'bg-indigo-600' : role === 'staff' ? 'bg-amber-600' : 'bg-slate-800'}`}>
                <Camera size={14} className="sm:size-4 stroke-[2.5]" />
              </div>
              <span className="text-sm sm:text-lg font-black tracking-tighter">
                PHOT<span className={`${role === 'admin' ? 'text-indigo-600' : role === 'staff' ? 'text-amber-600' : 'text-slate-500'}`}>O</span>X
              </span>
              {role === 'admin' ? (
                <span className="text-[8px] sm:text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                  Admin
                </span>
              ) : role === 'staff' ? (
                <span className="text-[8px] sm:text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                  Staff
                </span>
              ) : (
                <span className="text-[8px] sm:text-[9px] font-black bg-slate-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                  Guest
                </span>
              )}
            </div>
          )}
  
          {/* 照片总数展示 */}
          <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-black bg-white/60 backdrop-blur-sm border border-slate-200/30 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 select-none shrink-0 cursor-default min-w-[40px] justify-center">
            <span className="text-emerald-600 block text-center" title={lang === 'zh' ? '照片总数' : 'Total photo count'}>
              {t.photosCount(totalCount)}
            </span>
          </div>
        </div>
  
        {/* 右侧：管理/登录入口 */}
        <div className="flex items-center gap-0.5 sm:gap-2 flex-nowrap shrink-0">
          
          {/* 选择模式/多选 按钮 */}
          <button
            onClick={() => {
              if (isMultiSelect) {
                update({ isMultiSelect: false, selectedIds: [] });
              } else {
                update({ isMultiSelect: true });
              }
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border ${
              isMultiSelect 
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 shadow-sm'
            }`}
            title={isMultiSelect ? t.exitSelectMode : t.selectModeToggle}
          >
            <DynamicIcon name="check-square" className="size-4.5 sm:size-5" />
          </button>
  
          {/* AI 智能识别 按钮 next to check screen */}
          <button
            onClick={() => handleBatchAiIdentifyTrigger()}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 shadow-sm"
            title={t.aiSmartIdentify}
          >
            <DynamicIcon name="sparkles" className="size-4.5 sm:size-5 animate-pulse" />
          </button>
  
          {/* 3. 切换至前台体验按钮 (标准 LayoutDashboard 样式) */}
          <button
            onClick={handleAuthAction}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
            title={t.viewModePublic}
          >
            <DynamicIcon name="layout-dashboard" className="size-4.5 sm:size-5" />
          </button>
  
          {/* 4. 菜单 (语言、登录、退出) */}
          <DropdownMenu
            align="end"
            trigger={
              <div className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-full transition-all cursor-pointer shrink-0 border border-slate-200 bg-white">
                <DynamicIcon name="menu" size={18} className="sm:size-5" />
              </div>
            }
          >
            <div className="flex flex-col gap-1 w-full min-w-[200px]">
              {user ? (
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px]">
                    {user.photo_url && user.photo_url.trim() !== '' ? (
                      <img src={user.photo_url} referrerPolicy="no-referrer" alt="" loading="lazy" />
                    ) : (
                      <DynamicIcon name="user" size={10} />
                    )}
                  </div>
                  {user.email?.split("@")[0]}
                </div>
              ) : (
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                  {t.guestLabel}
                </div>
              )}
              
              <div className="h-px bg-slate-100 my-1 w-full" />

              <div className="px-2 py-1.5 flex flex-col gap-1 w-full">
                <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t.systemLabel}</span>
                {user && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/admin/settings' })}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <DynamicIcon name="settings" size={16} />
                      {t.systemSettings}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/admin/tasks' })}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <DynamicIcon name="layout-grid" size={16} />
                      {t.taskCenter}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/admin/diagnostics' })}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <DynamicIcon name="terminal" size={16} />
                      {t.systemLogs}
                    </button>
                  </>
                )}
                <div className="mt-1">
                  <LanguageSwitcher mode="segmented" />
                </div>
              </div>

              {user && (
                <>
                  <div className="h-px bg-slate-100 my-1 w-full" />
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-red-50 text-red-600"
                  >
                    <DynamicIcon name="log-out" size={16} />
                    {t.signOutAccount}
                  </button>
                </>
              )}
            </div>
          </DropdownMenu>
      </div>
    </header>
  );
}
