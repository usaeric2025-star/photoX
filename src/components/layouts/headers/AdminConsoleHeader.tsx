import React from "react";
import { motion } from "motion/react";
import {
  RefreshCw,
  LogOut,
  ChevronLeft,
  Settings2,
  ExternalLink,
  X,
  LayoutDashboard
} from "lucide-react";
import { useAuth, useAdminMode, useSyncMutation, useUIStore } from "@/hooks";
import { useAppLang } from "@/store/useUIStore";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

interface AdminConsoleHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  totalCount?: number;
  title?: string;
  onExit: () => void;
}

/**
 * [V3.0-UI-REDESIGN] Admin Console Header
 * Features a high-contrast, professional management aesthetic.
 */
export function AdminConsoleHeader({
  onRefresh,
  isRefreshing,
  totalCount,
  title,
  onExit,
}: AdminConsoleHeaderProps) {
  const [lang] = useAppLang();
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  return (
    <header 
      id="photo-admin-header"
      className="h-16 shrink-0 border-b px-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-slate-200/60 text-slate-800 z-[50] relative select-none"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200 ring-4 ring-slate-50 transition-transform active:scale-95">
            <LayoutDashboard size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span className="truncate max-w-[120px] sm:max-w-[300px]">{title || "Console"}</span>
              {totalCount !== undefined && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200">
                  {totalCount}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Management Core Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-2.5 rounded-xl transition-all active:scale-90 border",
              isRefreshing 
                ? "bg-slate-50 border-slate-100 text-slate-300" 
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm"
            )}
            title={t.refresh}
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{
                repeat: isRefreshing ? Infinity : 0,
                duration: 1,
                ease: "linear",
              }}
            >
              <RefreshCw size={18} />
            </motion.div>
          </button>
        )}

        <div className="h-8 w-[1px] bg-slate-200 mx-1" />

        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 group shadow-sm"
        >
          <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          <span>Exit</span>
        </button>

        <button
          onClick={onExit}
          className="flex items-center justify-center w-10 h-10 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 hover:border-red-600 rounded-xl transition-all active:scale-95 shadow-sm"
          title="关闭管理界面"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}
