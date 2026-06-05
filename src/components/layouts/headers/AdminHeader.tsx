import React from "react";
import {
  RefreshCw,
  User as UserIcon,
  LogOut,
  Settings,
  Menu,
  Sparkles,
  ListChecks,
  Image,
  Camera,
  LayoutGrid,
  BarChart3,
  Tag,
  Layers,
  Terminal,
  Home,
  Wrench,
  Plus,
  Cloud,
} from "lucide-react";
import { LanguageSwitcher } from "../../ui/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAuth,
  useUIStore,
  useShallow,
  useSettings,
  useMultiSelect,
  usePhotoCount,
  usePermission,
  useAdminMode,
} from "@/hooks";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { logoutPublic } from "@/lib/publicAuth";
import { cn } from "@/lib/utils";

import { useNavigate } from '@tanstack/react-router';

interface AdminHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  totalCount?: number;
  onBatchAiIdentify?: () => void;
}

export function AdminHeader({
  onRefresh,
  isRefreshing,
  totalCount: countProp,
  onBatchAiIdentify,
}: AdminHeaderProps) {
  const { user } = useAuth();
  const { isStaff, can } = usePermission();
  const isAdminPath = useAdminMode();
  const isEffectiveStaffMode = isAdminPath && !user;

  const { settings } = useSettings();
  const { isMultiSelect, disable, enable } = useMultiSelect();
  const { deletePhoto, batchUpdate } = useAdminActions();

  // 获取云端总数与本地缓存数
  const { data: cloudCount } = usePhotoCount({
    source: "server",
    isAdminMode: true,
  });
  const { data: localCount } = usePhotoCount({ source: "local" });

  const update = useUIStore((s) => s.update);

  const isSelectionMode = isMultiSelect;

  const navigate = useNavigate();

  const handleBackToShowcase = () => {
    navigate({ to: '/', search: { preview: 'true' } as any });
  };

  const handleImport = () => {
    update({ activeScreen: 'home' });
    setTimeout(() => {
      document.getElementById('admin-quick-add-input')?.click();
    }, 150);
  };

  const handleBatchDelete = async () => {
    const selectedIds = useUIStore.getState().selectedIds || [];
    update({
        alertDialog: {
            title: "确认删除",
            message: `确认删除这 ${selectedIds.length} 张照片吗？`,
            confirmLabel: "删除",
            type: "danger",
            onConfirm: async () => {
              await deletePhoto(selectedIds);
              disable();
            }
        }
    });
  };

  const handleBatchHide = async () => {
    const selectedIds = useUIStore.getState().selectedIds || [];
    await batchUpdate.execute({
      ids: selectedIds,
      updates: { is_hidden: true },
    });
    disable();
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-white border-slate-200 text-slate-800 z-30 font-sans overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {settings?.logo_url ? (
          <img
            src={settings.logo_url}
            className="h-6 sm:h-7 w-auto object-contain shrink-0"
            alt="Logo"
          />
        ) : (
          <div className="flex items-center gap-1.5 font-bold tracking-tighter text-slate-900">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm text-white shrink-0">
              <Camera size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tighter">
              PHOT<span className="text-blue-600">O</span>X
            </span>
          </div>
        )}
        <div className="flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold gap-1 shrink-0">
          <span>{countProp !== undefined ? countProp : localCount}</span>
          <span className="text-slate-300">/</span>
          <span>{cloudCount || 0}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        
        {/* 1. AI 识别 */}
        {onBatchAiIdentify && (
          <button
            onClick={onBatchAiIdentify}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-all active:scale-90"
            title="AI 批量识别"
          >
            <Sparkles size={18} />
          </button>
        )}

        {/* 2. 选择按钮 */}
        <button
          onClick={() => (isSelectionMode ? disable() : enable())}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90",
            isSelectionMode
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:bg-slate-100",
          )}
          title="多选模式"
        >
          <ListChecks size={18} />
        </button>

        {/* 3. 切换至展厅按钮 */}
        <button
          onClick={handleBackToShowcase}
          className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-all active:scale-95 shrink-0 ml-1 border border-blue-100"
          title="预览展厅"
        >
          <LayoutGrid size={20} />
        </button>

        {/* 4. 菜单 (语言、管理、退出) */}
        {(user || isStaff || isEffectiveStaffMode) && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-all cursor-pointer shrink-0 outline-none ml-1 border border-slate-100">
              <Menu size={22} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 mt-2 rounded-2xl p-2 bg-white shadow-2xl border border-slate-200 z-50 text-slate-700 max-h-[85vh] overflow-y-auto"
            >
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                  {user?.photo_url ? (
                    <img src={user.photo_url} referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={10} />
                  )}
                </div>
                {user ? (user.email?.split("@")[0]) : 'STAFF'}
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />

              {/* Mobile-Only Navigation Links */}
              <div className="lg:hidden px-2 py-1 flex flex-col gap-0.5">
                <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">导航 / Menu</span>
                
                <DropdownMenuItem
                  onClick={handleImport}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                >
                  <Plus size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-900">快速导入照片</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => update({ activeScreen: "home" })}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                >
                  <Home size={15} />
                  <span className="text-xs font-medium">照片库 / Gallery</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => update({ activeScreen: "dashboard" })}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                >
                  <BarChart3 size={15} />
                  <span className="text-xs font-medium">仪表盘 / Dashboard</span>
                </DropdownMenuItem>

                {can('photo:edit') && (
                  <>
                    <DropdownMenuItem
                      onClick={() => update({ activeScreen: "manage" })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                    >
                      <Cloud size={15} />
                      <span className="text-xs font-medium">云端存储管理</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => update({ activeScreen: "ai_settings" })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                    >
                      <Sparkles size={15} />
                      <span className="text-xs font-medium">AI 智能配置</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => update({ activeScreen: "structure" })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                    >
                      <Layers size={15} />
                      <span className="text-xs font-medium">分类 / 厂商管理</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => update({ activeScreen: "tags" })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                    >
                      <Tag size={15} />
                      <span className="text-xs font-medium">标签管理</span>
                    </DropdownMenuItem>
                  </>
                )}
                
                {can('admin:dashboard:access') && (
                  <>
                    <DropdownMenuItem
                      onClick={() => update({ activeScreen: "settings" })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                    >
                      <Wrench size={15} />
                      <span className="text-xs font-medium">系统设置与维护</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => update({ activeScreen: "logs" })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                    >
                      <Terminal size={15} />
                      <span className="text-xs font-medium">系统日志</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
              </div>

              <div className="px-2 py-1.5 flex flex-col gap-1.5">
                <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language</span>
                <LanguageSwitcher mode="segmented" />
              </div>

              <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />

              {can('admin:dashboard:access') && (
                <DropdownMenuItem
                  onClick={() => update({ activeScreen: "settings" })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
                >
                  <Settings size={16} />
                  <span className="text-sm font-semibold text-slate-900">管理后台</span>
                </DropdownMenuItem>
              )}

              {user ? (
                <DropdownMenuItem
                  onClick={async () => {
                     const { logoutPublic } = await import("@/lib/publicAuth");
                     logoutPublic();
                     window.location.reload();
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors mt-1 border-none"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">登出账号</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    window.localStorage.removeItem('ais_mock_auth_passcode');
                    window.location.reload();
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors mt-1 border-none"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">退出员工模式</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
