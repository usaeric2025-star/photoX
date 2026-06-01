import React from "react";
import {
  RefreshCw,
  User as UserIcon,
  LogOut,
  Settings,
  LayoutGrid,
  Brain,
  ListChecks,
  Menu,
  Plus,
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
  const { selectedIds, disable, enable } = useMultiSelect();
  const { deletePhoto, batchUpdate } = useAdminActions();

  // 获取云端总数与本地缓存数 (示例逻辑，实际可能需要根据 db 状态判断)
  const { data: cloudCount } = usePhotoCount({
    source: "server",
    isAdminMode: true,
  });
  const { data: localCount } = usePhotoCount({ source: "local" });

  const { update } = useUIStore(
    useShallow((s) => ({
      update: s.update,
    })),
  );

  const isSelectionMode = selectedIds.length > 0;

  const handleBackToShowcase = () => {
    update({ viewMode: "public" });
    update({ activeScreen: "gallery" });
  };

  const handleBatchDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedIds.length} photos?`,
      )
    ) {
      await deletePhoto(selectedIds);
      disable();
    }
  };

  const handleBatchHide = async () => {
    await batchUpdate.mutateAsync({
      ids: selectedIds,
      updates: { is_hidden: true },
    });
    disable();
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-slate-900 border-slate-800 text-white z-30 font-sans overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        <h1 className="text-lg sm:text-xl font-black text-white tracking-tighter whitespace-nowrap shrink-0 flex items-center">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              className="h-6 sm:h-7 w-auto object-contain shrink-0 brightness-0 invert"
              alt="Logo"
            />
          ) : (
            <span>
              PHOT<span className="text-blue-400">O</span>X
            </span>
          )}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
          <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[8px] sm:text-[10px] font-bold whitespace-nowrap shrink-0 border border-slate-700">
            L: {localCount}
          </div>
          <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 text-[8px] sm:text-[10px] font-bold whitespace-nowrap shrink-0 border border-blue-900/50">
            C: {cloudCount || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        {/* 0. 上传按钮 */}
        <button
          onClick={() => {
            const input = document.getElementById('admin-quick-add-input');
            if (input) (input as HTMLInputElement).click();
          }}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded-full transition-all active:scale-90"
          title="上传照片"
        >
          <Plus size={20} />
        </button>

        {/* 1. AI 识别 */}
        {onBatchAiIdentify && (
          <button
            onClick={onBatchAiIdentify}
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded-full transition-all active:scale-90"
            title="AI 批量识别"
          >
            <Brain size={18} />
          </button>
        )}

        {/* 2. 选择按钮 */}
        <button
          onClick={() => (isSelectionMode ? disable() : enable())}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90",
            isSelectionMode
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800",
          )}
          title="多选模式"
        >
          <ListChecks size={18} />
        </button>

        {/* 3. 菜单 (语言、后台、退出) */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded-full transition-all cursor-pointer shrink-0 outline-none">
              <Menu size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 mt-2 rounded-2xl p-2 bg-slate-900 shadow-2xl border border-slate-800 z-50 text-slate-300"
            >
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                  {user.photo_url ? (
                    <img src={user.photo_url} referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={10} />
                  )}
                </div>
                {user.email?.split("@")[0]}
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="mx-2 my-1 bg-slate-800" />

              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Language
                </span>
                <LanguageSwitcher variant="full-management" />
              </div>

              <DropdownMenuSeparator className="mx-2 my-1 bg-slate-800" />

              <DropdownMenuItem
                onClick={() => update({ activeScreen: "settings" })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 focus:bg-slate-800 cursor-pointer transition-colors border-none"
              >
                <Settings size={16} />
                <span className="text-sm font-semibold">管理后台</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => logoutPublic()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-950 focus:bg-red-950 cursor-pointer transition-colors mt-1 border-none"
              >
                <LogOut size={16} />
                <span className="text-sm font-semibold">退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 4. 切换按钮 (统一放在最右边) */}
        <button
          onClick={handleBackToShowcase}
          className="w-9 h-9 flex items-center justify-center bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-all active:scale-95 shrink-0 ml-1"
          title="切换至照片展厅"
        >
          <LayoutGrid size={18} />
        </button>
      </div>
    </header>
  );
}
