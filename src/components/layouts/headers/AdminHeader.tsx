import React from 'react';
import { LayoutDashboard, Camera, Menu, User as UserIcon, LogOut, Settings, LayoutGrid, MonitorPlay, CheckSquare, Sparkles } from 'lucide-react';
import { useAuth, useUIStore, useSettings, usePhotoCount } from '@/hooks';
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

interface AdminHeaderProps {
  onAiAnalyze?: () => void;
}

export function AdminHeader({ onAiAnalyze }: AdminHeaderProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const lang = useUIStore(s => s.appLang);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const { data: cloudCount } = usePhotoCount({ source: 'server' });
  const { data: localCount } = usePhotoCount({ source: 'local' });

  const handleAuthAction = () => {
    navigate({ to: '/' });
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-slate-50 border-slate-200 z-header font-sans overflow-hidden">
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {settings?.logo_url ? (
          <img src={settings.logo_url} className="h-8 sm:h-9 w-auto object-contain shrink-0" alt="Logo" />
        ) : (
          <div className="flex items-center gap-1.5 font-bold tracking-tighter text-slate-850">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm text-white shrink-0">
              <Camera size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tighter">
              PHOT<span className="text-slate-500">O</span>X
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 hidden sm:inline-block">Admin</span>
          </div>
        )}

        {/* 本地与云端组合数字展示 */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/50 rounded-full px-2.5 py-1 select-none shrink-0 cursor-default">
          <span className="text-[#3b82f6] font-medium">{lang === 'zh' ? '本地' : lang === 'ms' ? 'Lokal' : 'Local'}: <strong className="font-bold">{localCount ?? 0}</strong></span>
          <span className="text-slate-300">|</span>
          <span className="text-[#10b981] font-medium">{lang === 'zh' ? '云端' : lang === 'ms' ? 'Awan' : 'Cloud'}: <strong className="font-bold">{cloudCount ?? 0}</strong></span>
        </div>
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

        {/* AI 智能识别 按钮 next to check screen */}
        {onAiAnalyze && (
          <button
            onClick={onAiAnalyze}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 ml-1 border bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 shadow-sm"
            title={lang === 'zh' ? 'AI 属性智能识别' : 'AI Smart Identification'}
          >
            <Sparkles size={18} className="animate-pulse" />
          </button>
        )}

        {/* 3. 切换至前台体验按钮 (标准 LayoutDashboard 样式) */}
        <button
          onClick={handleAuthAction}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 ml-1 border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
          title="切换至公开模式 (返回主页)"
        >
          <LayoutDashboard size={20} />
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
