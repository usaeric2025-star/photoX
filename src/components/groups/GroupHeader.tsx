import React from "react";
import {
  ChevronLeft,
  Pencil,
  X,
  Edit2,
  Copy
} from "lucide-react";
import { Photo, ProductGroup } from "../../types";
import { Skeleton } from "../ui/Skeleton";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { useUrlFilters, useGroupMutations } from "@/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useClipboard } from "@mantine/hooks";
import { toast } from "sonner";
import { translations } from "@/lib/translations";

interface GroupHeaderProps {
  activeGroupId: string | null;
  update: (updates: any) => void;
  isAdminMode: boolean;
  groupData: ProductGroup | null;
  isGroupDataLoading: boolean;
  activeGroupPhotos: Photo[];
}

export function GroupHeader({
  activeGroupId,
  isAdminMode,
  groupData,
  isGroupDataLoading,
  activeGroupPhotos,
}: GroupHeaderProps) {
  const { setGroupId } = useUrlFilters();
  const navigate = useNavigate();
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  const handleClose = () => {
    navigate({ to: isAdmin ? '/admin' : '/', search: (prev: any) => ({ ...prev, groupId: undefined, photoId: undefined }) });
  };
  const { update, isMultiSelect, selectedIds, appLang } =
    useUIStore(
      useShallow((s) => ({
        update: s.update,
        isMultiSelect: s.isMultiSelect,
        selectedIds: s.selectedIds,
        appLang: s.appLang
      })),
    );

  const clipboard = useClipboard();
  const onBatchEdit = (ids: string[]) => update?.({ batchEditingIds: ids });
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const l = {
    batchEdit: appLang === 'zh' ? '批量编辑' : appLang === 'ms' ? 'Edit Pukal' : 'Batch Edit',
  };

  const displayName = (typeof groupData?.name === 'object' ? (groupData?.name?.[appLang as keyof typeof groupData.name] || groupData?.name?.zh || groupData?.name?.en || groupData?.name?.ms) : groupData?.name) || `GROUP ${activeGroupId?.slice(-4)}`;
  const displayDesc = (typeof groupData?.description === 'object' ? (groupData?.description?.[appLang as keyof typeof groupData.description] || groupData?.description?.zh || groupData?.description?.en || groupData?.description?.ms) : groupData?.description) || '';

  return (
    <div className="flex flex-col border-b border-slate-100 bg-white">
      <div className="flex flex-shrink-0 sticky top-0 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={handleClose}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div
            className="flex flex-col cursor-pointer group min-w-0 flex-1"
            onClick={() => {
              if (isAdminMode) {
                update?.({ groupSettingsOpen: true } as any);
              }
            }}
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
                  {activeGroupId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clipboard.copy(activeGroupId);
                        toast.success("Group ID copied to clipboard");
                      }}
                      className="text-xs text-slate-400 font-mono hover:text-indigo-600 flex items-center gap-1 transition-colors"
                      title={appLang === 'zh' ? '点击复制 ID' : 'Click to copy ID'}
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

        <button
          onClick={handleClose}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 bg-white"
        >
          <X size={20} />
        </button>
      </div>

      {(displayDesc || isAdminMode) && (
        <div className="px-4 sm:px-6 pb-4">
          {displayDesc && (
            <p className="text-sm text-slate-600 mb-3">{displayDesc}</p>
          )}
          {isAdminMode && (
            <button
              onClick={() => onBatchEdit(activeGroupPhotos.map(p => p.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              <Edit2 size={14} />
              {l.batchEdit}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
