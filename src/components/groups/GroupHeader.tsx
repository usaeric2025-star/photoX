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
    <div className="flex-shrink-0 sticky top-0 bg-brand-bg/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
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
                  {/* [FIELD-LEVEL-FALLBACK] Render group name, first photo name, or ID as last resort */}
                  {groupData?.name ||
                    activeGroupPhotos[0]?.name ||
                    activeGroupPhotos[0]?.item_code ||
                    `GROUP ${activeGroupId?.slice(-4)}`}
                </h2>
                {groupData && (
                  <span className="flex-shrink-0 bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1">
                    <span className="opacity-50">CODE:</span>
                    {activeGroupId?.slice(-6).toUpperCase()}
                  </span>
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
          <div className="min-h-[1rem] overflow-hidden">
            {isGroupDataLoading ? (
              <Skeleton className="h-3 w-40 mt-1 bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none flex items-center gap-2 truncate">
                <span className="truncate">
                  {groupData?.name
                    ? `${l.cover}: ${activeGroupPhotos[0]?.name || ""}`
                    : `${activeGroupPhotos.length} ${l.photos}`}
                </span>
                {activeGroupId && (
                  <span className="flex-shrink-0 font-mono opacity-50 bg-slate-100/50 px-1 py-0.5 rounded border border-slate-200">
                    ID: {activeGroupId.split('-')[0]}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-2">
        {isAdminMode && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                if (activeGroupId) {
                  update?.({ photoPickerGroupId: activeGroupId });
                  update?.({ isPhotoPickerOpen: true });
                }
              }}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm active:scale-95 transition-all"
              title={l.addPhotos}
            >
              <Plus size={20} />
            </button>

            <button
              onClick={() => update?.({ groupSettingsOpen: true } as any)}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-indigo-200 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all"
              title={l.database}
            >
              <Settings2 size={18} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all">
                <MoreVertical size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 sm:w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-[200]"
              >
                <DropdownMenuItem
                  onClick={() => {
                    const ids =
                      selectedIds.length > 0
                        ? selectedIds
                        : activeGroupPhotos.map((p) => p.id);
                    if (onBatchEdit) onBatchEdit(ids);
                    update?.({ isMultiSelect: false });
                    update?.({ selectedIds: [] });
                  }}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                >
                  <Pencil size={15} className="text-slate-500" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
                    {l.edit}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedIds.length > 0 && onBatchAiAnalyze) {
                      onBatchAiAnalyze(
                        activeGroupPhotos.filter((p) =>
                          selectedIds.includes(p.id),
                        ),
                      );
                    } else if (onBatchAiAnalyzeByGroupId && activeGroupId) {
                      onBatchAiAnalyzeByGroupId(activeGroupId);
                    } else if (onBatchAiAnalyze) {
                      onBatchAiAnalyze(activeGroupPhotos);
                    }
                  }}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                >
                  <Sparkles size={15} className="text-purple-500" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
                    {l.ai}
                  </span>
                </DropdownMenuItem>
                <div className="h-px bg-slate-100 my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    update?.({ 
                      alertDialog: {
                        title: l.dissolve,
                        message: l.dissolveConfirm,
                        type: 'danger',
                        onConfirm: async () => {
                           if (!activeGroupId) return;
                           try {
                              await dissolve.mutateAsync(activeGroupId);
                              handleClose();
                           } catch (err) {
                              toast.error(`${l.dissolve} ${appLang === 'zh' ? '失败' : appLang === 'ms' ? 'gagal' : 'failed'}: ${(err as Error).message}`);
                           }
                        }
                      }
                    });
                  }}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer flex items-center gap-2 hover:bg-red-50 focus:bg-red-50 outline-none"
                >
                  <FolderMinus size={15} className="text-red-500" />
                  <span className="text-xs sm:text-sm font-bold text-red-600 truncate">
                    {l.dissolve}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <button
          onClick={handleClose}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors ml-1 border border-slate-200 bg-white"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
