import React from 'react';
import { LayoutDashboard, Camera, Menu, User as UserIcon, LogOut, Settings, LayoutGrid, MonitorPlay, CheckSquare, X } from 'lucide-react';
import { useAuth, useUIStore, useSettings } from '@/hooks';
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

export function AdminHeader() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const lang = useUIStore(s => s.appLang);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const handleAuthAction = () => {
    navigate({ to: '/' });
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-slate-50 border-slate-200 z-header font-sans overflow-hidden">
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {settings?.logo_url ? (
          <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
        ) : (
          <div className="flex items-center gap-1.5 font-bold tracking-tighter text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm text-white shrink-0">
              <Camera size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tighter">
              PHOT<span className="text-slate-500">O</span>X
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 hidden sm:inline-block">Admin</span>
          </div>
        )}
      </div>

      {/* 右侧：管理/登录入口 */}
      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        {/* 选择模式/多选 按钮 */}
        <button
          onClick={() => update({ isMultiSelect: !isMultiSelect })}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 ml-1 border ${
            isMultiSelect 
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 shadow-sm'
          }`}
          title={isMultiSelect ? "退出多选" : "选择模式 / 多选"}
        >
          <CheckSquare size={18} />
        </button>

        {/* 3. 切换至前台体验按钮 (与 PublicHeader 统一使用 LayoutDashboard 图案的按钮) */}
        <button
          onClick={handleAuthAction}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 ml-1 border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 shadow-sm"
          title="切换至公开模式 (返回主页)"
        >
          <LayoutDashboard size={20} />
        </button>

        {/* 另外在进入管理后台时，在里面给他一个关闭的按钮可以回到管理页面 (主展示页面) */}
        <button
          onClick={() => navigate({ to: '/' })}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 ml-1 border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 shadow-sm"
          title="关闭 (返回主页)"
        >
          <X size={20} />
        </button>

        {/* 4. 菜单 (语言、登录、退出) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-full transition-all cursor-pointer shrink-0 outline-none ml-1 border border-slate-200">
            <Menu size={22} />
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
                  GUEST
                </DropdownMenuLabel>
             )}

            <div className="px-2 py-1.5 flex flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</span>
              {user && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                        useUIStore.getState().update({ activeScreen: 'settings' });
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                  >
                    <Settings size={16} />
                    <span className="text-sm font-semibold">{t.systemSettings || 'Settings'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => useUIStore.getState().update({ activeScreen: 'tasks' })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                  >
                    <LayoutGrid size={16} />
                    <span className="text-sm font-semibold">Task Center</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => useUIStore.getState().update({ activeScreen: 'error-logs' })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
              >
                <LayoutGrid size={16} />
                <span className="text-sm font-semibold">Error Logs</span>
              </DropdownMenuItem>
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
