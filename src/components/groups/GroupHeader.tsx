import React from "react";
import { ChevronLeft, X, Pencil, Copy, Edit2 } from "lucide-react";
import { Photo } from "../../types";
import { Skeleton } from "../ui/Skeleton";

interface GroupHeaderProps {
  displayName: string;
  activeGroupId: string | null;
  isAdminMode?: boolean;
  isGroupDataLoading: boolean;
  onClose: () => void;
  onSettingsClick?: () => void;
  onCopyId?: (id: string) => void;
  onBatchEdit?: (photoIds: string[]) => void;
  activeGroupPhotos?: Photo[];
  appLang: string;
}

export function GroupHeader({
  displayName,
  activeGroupId,
  isAdminMode = false,
  isGroupDataLoading,
  onClose,
  onSettingsClick,
  onCopyId,
  onBatchEdit,
  activeGroupPhotos = [],
  appLang
}: GroupHeaderProps) {
  const l = {
    batchEdit: appLang === 'zh' ? '批量编辑' : appLang === 'ms' ? 'Edit Pukal' : 'Batch Edit',
  };

  return (
    <div className="flex flex-col border-b border-slate-100 bg-white">
      <div className="flex flex-shrink-0 sticky top-0 z-[var(--z-sticky)] px-4 sm:px-6 py-4 items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`flex flex-col group min-w-0 flex-1 ${onSettingsClick ? 'cursor-pointer' : ''}`}
            onClick={onSettingsClick}
          >
            <div className="flex flex-col gap-0.5 min-h-[1.75rem] overflow-hidden">
              {isGroupDataLoading ? (
                <Skeleton className="h-6 w-32 bg-slate-200 animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight uppercase truncate">
                      {displayName}
                    </h2>
                    {isAdminMode && (
                      <Pencil
                        size={12}
                        className="flex-shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                  </div>
                  {activeGroupId && onCopyId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyId(activeGroupId);
                      }}
                      className="text-xs text-slate-400 font-mono hover:text-indigo-600 flex items-center gap-1 transition-colors"
                    >
                      ID: {activeGroupId.slice(-8)}
                      <Copy size={10} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdminMode && onBatchEdit && (
            <button
              onClick={() => onBatchEdit(activeGroupPhotos.map(p => p.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              <Edit2 size={14} />
              <span className="hidden sm:inline">{l.batchEdit}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 bg-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
