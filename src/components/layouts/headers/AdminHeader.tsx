import React from 'react';
import { LayoutDashboard, Camera, Menu, User as UserIcon, LogOut, Settings, LayoutGrid, MonitorPlay, CheckSquare, Sparkles } from 'lucide-react';
import { useAuth, useUIStore, useSettings, usePhotoCount, useAdminBatchActions, usePermission } from '@/hooks';
import { useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutPublic } from "@/lib/publicAuth";
import { translations } from "@/lib/translations";


interface AdminHeaderProps {}

export function AdminHeader({}: AdminHeaderProps) {
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { role } = usePermission();
  const navigate = useNavigate();

  const lang = useUIStore(s => s.appLang);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const { data: cloudCount } = usePhotoCount({ source: 'server' });
  const { data: localCount } = usePhotoCount({ source: 'local' });

  const [cachedLogoUrl, setCachedLogoUrl] = React.useState<string | null>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem('photox_cached_settings') : null;
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

  // Roles background mappings:
  // - Admin: bg-indigo-50/90 border-indigo-200/50
  // - Staff: bg-amber-50/85 border-amber-200/50
  // - Guest/Public: bg-white border-slate-200
  const headerBgClass = role === 'admin'
    ? "bg-indigo-50/90 border-indigo-200/50 text-indigo-950"
    : role === 'staff'
    ? "bg-amber-50/85 border-amber-200/50 text-amber-950"
    : "bg-white border-slate-200 text-slate-850";

  return (
    <header className={`h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-4 flex items-center justify-between z-header font-sans overflow-hidden transition-colors duration-300 ${headerBgClass}`}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0 flex-nowrap">
        {logoUrl ? (
          <img 
              src={logoUrl} 
              className="h-7 sm:h-9 w-auto object-contain shrink-0" 
              alt="Logo" 
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
  
          {/* 本地与云端组合数字展示 */}
          <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-black bg-white/60 backdrop-blur-sm border border-slate-200/30 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 select-none shrink-0 cursor-default">
            <span className="text-blue-600" title={lang === 'zh' ? '本地 (待同步) 照片数' : 'Local photos waiting for cloud sync'}>{localCount ?? 0}</span>
            <span className="text-slate-300 font-normal">/</span>
            <span className="text-emerald-600" title={lang === 'zh' ? '云端已同步照片数' : 'Synced cloud photos'}>{cloudCount ?? 0}</span>
          </div>
        </div>
  
        {/* 右侧：管理/登录入口 */}
        <div className="flex items-center gap-0.5 sm:gap-2 flex-nowrap shrink-0">
          {/* 选择模式/多选 按钮 */}
          <button
            onClick={() => update({ isMultiSelect: !isMultiSelect })}
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border ${
              isMultiSelect 
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 shadow-sm'
            }`}
            title={isMultiSelect ? t.exitSelectMode : t.selectModeToggle}
          >
            <CheckSquare className="size-4.5 sm:size-5" />
          </button>
  
          {/* AI 智能识别 按钮 next to check screen */}
          <button
            onClick={() => handleBatchAiIdentifyTrigger()}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 shadow-sm"
            title={t.aiSmartIdentify}
          >
            <Sparkles className="size-4.5 sm:size-5 animate-pulse" />
          </button>
  
          {/* 3. 切换至前台体验按钮 (标准 LayoutDashboard 样式) */}
          <button
            onClick={handleAuthAction}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
            title={t.viewModePublic}
          >
            <LayoutDashboard className="size-4.5 sm:size-5" />
          </button>
  
          {/* 4. 菜单 (语言、登录、退出) */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-full transition-all cursor-pointer shrink-0 outline-none border border-slate-200 bg-white">
              <Menu size={18} className="sm:size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
            align="end"
            className="w-64 mt-2 rounded-2xl p-2 bg-white shadow-2xl border border-slate-200 z-dropdown text-slate-700"
          >
             {user ? (
                <>
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px]">
                      {user.photo_url ? (
                        <img src={user.photo_url} referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={10} />
                      )}
                    </div>
                    {user.email?.split("@")[0]}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
                </>
             ) : (
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.guestLabel}
                </DropdownMenuLabel>
             )}

            <div className="px-2 py-1.5 flex flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.systemLabel}</span>
              {user && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                        useUIStore.getState().update({ activeScreen: 'settings' });
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                  >
                    <Settings size={16} />
                    <span className="text-sm font-semibold">{t.systemSettings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => useUIStore.getState().update({ activeScreen: 'tasks' })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                  >
                    <LayoutGrid size={16} />
                    <span className="text-sm font-semibold">{t.taskCenter}</span>
                  </DropdownMenuItem>
                </>
              )}
              <LanguageSwitcher mode="segmented" />
            </div>

            <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />

            {user && (
              <>
                <DropdownMenuItem
                  onClick={() => logoutPublic()}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors mt-1 border-none"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">{t.logoutAccount}</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
