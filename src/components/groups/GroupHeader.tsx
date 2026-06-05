import React from "react";
import {
  ChevronLeft,
  Pencil,
  Sparkles,
  Settings2,
  MoreVertical,
  X,
  Plus,
  FolderMinus,
} from "lucide-react";
import { Photo, ProductGroup } from "../../types";
import { Skeleton } from "../ui/Skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { toast } from "sonner";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useNavigate } from "@tanstack/react-router";
import { useGroupMutations } from "@/hooks/core/mutations/useGroupMutations";
import { CopyableId } from '@/components/ui/CopyableId';

interface GroupHeaderProps {
  activeGroupId: string | null;
  update: (updates: any) => void;
  isAdminMode: boolean;
  groupData: ProductGroup | null;
  isGroupDataLoading: boolean;
  activeGroupPhotos: Photo[];
  onBatchAiAnalyzeByGroupId?: (groupId: string) => Promise<void | null>;
}

export function GroupHeader({
  activeGroupId,
  isAdminMode,
  groupData,
  isGroupDataLoading,
  activeGroupPhotos,
  onBatchAiAnalyzeByGroupId,
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

  const { useBatchAiAnalyze, dissolve } = useGroupMutations();
  const onBatchAiAnalyze = (photos: Photo[]) => useBatchAiAnalyze(photos);
  const onBatchEdit = (ids: string[]) => update?.({ batchEditingIds: ids });

  const l = {
    addPhotos: appLang === 'zh' ? '添加照片' : appLang === 'ms' ? 'Tambah Foto' : 'Add Photos',
    batchEdit: appLang === 'zh' ? '批量编辑' : appLang === 'ms' ? 'Edit Pukal' : 'Batch Edit',
    aiIdentify: appLang === 'zh' ? 'AI 識別' : appLang === 'ms' ? 'Kenal Pasti AI' : 'AI Identify',
    dissolve: appLang === 'zh' ? '解散合组' : appLang === 'ms' ? 'Bubarkan' : 'Dissolve',
    dissolveConfirm: appLang === 'zh' ? '确定要解散此合组吗？组内的照片将被移出但不会被删除。' : appLang === 'ms' ? 'Adakah anda pasti mahu membubarkan kumpulan ini? Foto akan dikeluarkan tetapi tidak dipadamkan.' : 'Are you sure you want to dissolve this group? Photos will be removed but not deleted.',
    database: appLang === 'zh' ? '群组数据库' : appLang === 'ms' ? 'Pangkalan Data' : 'Database',
    cover: appLang === 'zh' ? '封面' : appLang === 'ms' ? 'Kulit' : 'Cover',
    photos: appLang === 'zh' ? '张照片' : appLang === 'ms' ? 'foto' : 'photos',
    menu: appLang === 'zh' ? '菜单' : appLang === 'ms' ? 'Menu' : 'Menu',
    edit: appLang === 'zh' ? '编辑' : appLang === 'ms' ? 'Edit' : 'Edit', 
    ai: 'AI'
  };

  return (
    <div className="flex-shrink-0 sticky top-0 bg-white z-sticky px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
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
          <div className="flex items-center gap-2 min-h-[1.75rem] overflow-hidden">
            {isGroupDataLoading ? (
              <Skeleton className="h-6 w-32 bg-slate-200 animate-pulse" />
            ) : (
              <>
                <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight uppercase truncate flex-1 min-w-0">
                  {(typeof groupData?.name === 'object' ? (groupData?.name?.[appLang as keyof typeof groupData.name] || groupData?.name?.zh) : groupData?.name) || `GROUP ${activeGroupId?.slice(-4)}`}
                </h2>
                {activeGroupId && (
                  <CopyableId className="bg-slate-100/50 border-slate-200/50" id={activeGroupId} label="ID" />
                )}
                {isAdminMode && (
                  <Pencil
                    size={12}
                    className="flex-shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center ml-2 gap-2">
        {isAdminMode && onBatchAiAnalyzeByGroupId && (
          <button
            onClick={() => onBatchAiAnalyzeByGroupId(activeGroupId!)}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-90 border border-blue-100 bg-blue-50"
            title={l.aiIdentify}
          >
            <Sparkles size={18} />
          </button>
        )}
        <button
          onClick={handleClose}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 bg-white"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
