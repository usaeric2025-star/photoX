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
    navigate({ to: '/' });
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
    await batchUpdate.mutateAsync({
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

        {/* 3. 语言切换 (直接显示在 Header) */}
        <div className="flex items-center mx-1">
          <LanguageSwitcher mode="buttons" />
        </div>

        {/* 4. 菜单 (后台、退出) */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-all cursor-pointer shrink-0 outline-none">
              <Menu size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 mt-2 rounded-2xl p-2 bg-white shadow-2xl border border-slate-200 z-50 text-slate-700"
            >
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                  {user.photo_url ? (
                    <img src={user.photo_url} referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={10} />
                  )}
                </div>
                {user.email?.split("@")[0]}
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="mx-2 my-0.5 bg-slate-100" />

              <DropdownMenuItem
                onClick={() => update({ activeScreen: "settings" })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer transition-colors border-none"
              >
                <Settings size={16} />
                <span className="text-sm font-semibold">管理后台</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => logoutPublic()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors mt-1 border-none"
              >
                <LogOut size={16} />
                <span className="text-sm font-semibold">退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 5. 切换按钮 (统一放在最右边) */}
        <button
          onClick={handleBackToShowcase}
          className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-all active:scale-95 shrink-0 ml-1"
          title="切换至照片展厅"
        >
          <LayoutGrid size={18} />
        </button>
      </div>
    </header>
  );
}
