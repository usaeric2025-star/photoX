import React from "react";
import { motion } from "motion/react";
import {
  RefreshCw,
  LogOut,
  Camera,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DedicatedAdminHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  totalCount?: number;
  title?: string;
  onExitAdmin: () => void;
}

export function DedicatedAdminHeader({
  onRefresh,
  isRefreshing,
  totalCount,
  title,
  onExitAdmin,
}: DedicatedAdminHeaderProps) {
  
  return (
    <header className="h-14 shrink-0 border-b px-4 flex items-center justify-between bg-slate-900 border-slate-800 text-slate-100 z-[40] relative font-sans overflow-hidden">
      <div className="flex items-center gap-3 shrink-0 flex-nowrap">
        <div className="flex items-center gap-2 font-bold tracking-tighter text-white">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm text-white shrink-0">
            <ShieldCheck size={16} />
          </div>
          <span className="text-sm font-black uppercase tracking-widest text-slate-300">
            ADMIN <span className="text-blue-400">CONSOLE</span>
          </span>
        </div>
        
        {totalCount !== undefined && (
          <div className="flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold gap-1 shrink-0 border border-slate-700">
            <span>{totalCount} Total Items</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        {title && (
          <h1 className="text-xs font-medium text-slate-400 uppercase tracking-widest truncate sm:max-w-xs">
            {title}
          </h1>
        )}
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-800 rounded-lg transition-all active:scale-90"
            title="Refresh Data"
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{
                repeat: isRefreshing ? Infinity : 0,
                duration: 1,
                ease: "linear",
              }}
            >
              <RefreshCw size={16} />
            </motion.div>
          </button>
        )}

        <button
          onClick={onExitAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-lg text-xs font-bold transition-all active:scale-95 ml-2 border border-red-900/50"
          title="Exit Admin Panel"
        >
          <LogOut size={14} />
          <span>Exit Admin</span>
        </button>
      </div>
    </header>
  );
}
