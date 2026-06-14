import { useWatch } from 'react-hook-form';
import { usePhotoEditSessionContext } from "@/hooks/photo/usePhotoEditSessionContext";
import React from "react";
import {
  X as CloseIcon,
  EyeOff,
  Eye,
  Sparkles,
  Save,
  Trash2,
  Loader2,
  Star,
  LogOut as RemoveFromGroupIcon,
} from "lucide-react";
import {
  usePhoto,
  useTasks,
  useRemoveFromGroupMutation,
  useAdminMaintenance,
  usePhotoDelete,
} from "@/hooks";
import { showToast } from "@/lib/ui/toast";
import { useUIStore } from "@/store";
import { usePhotoEditAI } from "./usePhotoEditAI";

interface DrawerHeaderProps {
  onClose: () => void;
  onDeleteClick: () => void;
}

export function DrawerHeader({
  onClose,
  onDeleteClick,
}: DrawerHeaderProps) {
  const { control, setValue, commit, isPending } = usePhotoEditSessionContext();
  const isGroupCover = useWatch({ control, name: 'is_group_cover' });
  
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const { tasks } = useTasks();
  const isAnalyzing = tasks.some((t: any) => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析') || t.name.toLowerCase().includes('analyze') || t.name.toLowerCase().includes('identif')));
  const isSyncing = tasks.some((t: any) => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入')));
  const isRunning = tasks.some((t: any) => t.status === 'running');

  const { mutateAsync: removeFromGroup } = useRemoveFromGroupMutation();
  const { updatePhoto: { mutateAsync: updateAdminPhoto } } = useAdminMaintenance();
  const { mutateAsync: deletePhoto } = usePhotoDelete();
  
  const { handleAiAnalyze } = usePhotoEditAI();

  const isPartOfGroup = !!detailPhoto?.group_id;

  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.group_id) {
      await removeFromGroup({ photoIds: [editPhotoId], groupId: detailPhoto.group_id });
      useUIStore.getState().update({ editPhotoId: null });
    }
  };

  const onDelete = () => {
    if (confirm(appLang === 'zh' ? '确定要删除此照片吗？' : 'Are you sure you want to delete this photo?')) {
       if (editPhotoId) {
          deletePhoto([editPhotoId]).then(() => {
            useUIStore.getState().update({ editPhotoId: null });
          });
       }
    }
  };

  const onAiAnalyze = async () => {
    if (editPhotoId && detailPhoto?.image_url) {
      await handleAiAnalyze(detailPhoto.image_url);
    }
  }

  const l = {
    hidden: appLang === 'zh' ? '屏蔽' : appLang === 'ms' ? 'Sembunyi' : 'Hide',
    visible: appLang === 'zh' ? '显示' : appLang === 'ms' ? 'Tunjuk' : 'Show',
    editTitle: appLang === 'zh' ? '产品编辑' : appLang === 'ms' ? 'Edit Maklumat' : 'Edit Product',
    analyzeTitle: appLang === 'zh' ? '产品分析' : appLang === 'ms' ? 'Analisis Produk' : 'Analyze Product',
    cover: appLang === 'zh' ? '封面' : appLang === 'ms' ? 'Muka' : 'Cover',
  };

  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3 min-h-[72px]">
      <div className="flex-1 flex flex-col items-start justify-center min-w-0 px-2">
        <h2 className="font-black text-sm text-slate-800 tracking-tight leading-tight uppercase truncate w-full text-left">
          {editPhotoId ? l.editTitle : l.analyzeTitle}
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAiAnalyze}
            disabled={isAnalyzing || isRunning}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-slate-100 shadow-sm transition-all disabled:opacity-50 ${isAnalyzing ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" : "bg-purple-50 text-purple-600 border-purple-100 active:bg-purple-200"}`}
          >
            {isAnalyzing ? (
              <Loader2 size={16} className="text-current animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
          </button>
        </div>

        {isPartOfGroup && (
          <button
            onClick={() => {
              const newState = !isGroupCover;
              setValue('is_group_cover', newState, { shouldDirty: true });
              showToast.success(newState ? '已设为封面' : '已取消封面');
            }}
            title={l.cover}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-amber-200 shadow-sm transition-all ${isGroupCover ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" : "bg-white text-amber-500 border-amber-200 hover:bg-amber-50 active:scale-95"}`}
          >
            <Star size={20} className={isGroupCover ? "fill-white" : "fill-transparent"} />
          </button>
        )}

        {isPartOfGroup && (
          <button
            onClick={onRemoveFromGroup}
            title="移出合组"
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-200 active:scale-95 transition-all"
          >
            <RemoveFromGroupIcon size={18} />
          </button>
        )}

        {editPhotoId && (
          <button
            onClick={onDeleteClick}
            disabled={isRunning}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 shadow-sm active:bg-red-100 transition-all font-bold disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        )}

        <button
          onClick={commit}
          disabled={isSyncing || isRunning || isPending}
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-blue-600 shadow-sm transition-all disabled:opacity-50 ${isSyncing || isRunning || isPending ? "bg-blue-400 text-white border-blue-400 cursor-wait" : "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 active:bg-blue-700"}`}
        >
          {isSyncing || isRunning || isPending ? (
            <Loader2 size={16} className="text-current animate-spin" />
          ) : (
            <Save size={18} />
          )}
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full ml-1"
        >
          <CloseIcon size={20} />
        </button>
      </div>
    </div>
  );
}
