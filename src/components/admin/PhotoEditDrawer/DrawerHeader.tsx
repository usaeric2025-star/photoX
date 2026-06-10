import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useShallow } from "@/store/useUIStore";
import React from "react";
import {
  X as CloseIcon,
  EyeOff,
  Eye,
  RefreshCcw,
  Sparkles,
  Save,
  Trash2,
  Loader2,
  Star,
  LogOut,
  Info,
} from "lucide-react";
import { Skeleton } from "../../ui/Skeleton";
import { useUIStore } from "../../../store";
import { UseFormReturnType } from "@mantine/form";
import { ProductFormData, Photo } from "../../../types";
import { toast } from "sonner";
import { useDisclosure } from "@mantine/hooks";
import {
  usePhotoDetail,
  useTasks,
  useRemoveFromGroupMutation,
  useAdminActions,
  usePhotoDelete,
  useTaskExecutor,
  useSettings,
  PhotoEditFormReturn,
} from "../../../hooks";
import { analyzePhoto } from "@/services/ai/commands";
import { usePhotoEditAI } from "./usePhotoEditAI";

interface HeaderProps {
  editPhotoId: string | null;
  form: PhotoEditFormReturn;
  isAnalyzing: boolean;
  aiDebugInfo: any;
  isPartOfGroup: boolean;
  isSyncing: boolean;
  onAbort: (() => void) | undefined;
  onAiAnalyze: () => void;
  onDelete: (() => void) | undefined;
  onSave: () => void;
  onToggleHidden: () => void;
  onClose: () => void;
  onErrorClick: (err: string) => void;
  onRemoveFromGroup?: () => void;
  isRunning?: boolean;
  totalPhotosCount?: number;
}

export function DrawerHeader({
  form,
  onSave,
  onClose,
  previewSrc,
}: {
  form: PhotoEditFormReturn;
  onSave: () => void;
  onClose: () => void;
  previewSrc?: string;
}) {
  const formState = form.values;
  
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  
  const { data: detailPhoto } = usePhotoDetail(editPhotoId || '');
  const { tasks } = useTasks();
  const isAnalyzing = React.useMemo(() => tasks.some((t: any) => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [tasks]);
  const isSyncing = React.useMemo(() => tasks.some((t: any) => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入'))), [tasks]);
  const isRunning = React.useMemo(() => tasks.some((t: any) => t.status === 'running'), [tasks]);

  const { mutateAsync: removeFromGroup } = useRemoveFromGroupMutation();
  const { updatePhoto: { mutateAsync: updatePhoto } } = useAdminActions();
  const { mutateAsync: deletePhoto } = usePhotoDelete();
  const { runTask } = useTaskExecutor();
  const { settings } = useSettings();
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  const { handleAiAnalyze } = usePhotoEditAI(form);

  const isPartOfGroup = !!detailPhoto?.group_id;

  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.group_id) {
      await removeFromGroup({ photoIds: [editPhotoId], groupId: detailPhoto.group_id });
      useUIStore.getState().update({ editPhotoId: null });
    }
  };

  const onToggleHidden = async () => {
    const nextValue = !formState.is_hidden;
    form.setFieldValue('is_hidden', nextValue);
    if (editPhotoId) {
      await updatePhoto({ id: editPhotoId, updates: { is_hidden: nextValue } });
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
    await handleAiAnalyze(previewSrc, detailPhoto?.image_url);
  };

  const l = {
    hidden: appLang === 'zh' ? '屏蔽' : appLang === 'ms' ? 'Sembunyi' : 'Hide',
    visible: appLang === 'zh' ? '显示' : appLang === 'ms' ? 'Tunjuk' : 'Show',
    editTitle: appLang === 'zh' ? '产品编辑' : appLang === 'ms' ? 'Edit Maklumat' : 'Edit Product',
    analyzeTitle: appLang === 'zh' ? '产品分析' : appLang === 'ms' ? 'Analisis Produk' : 'Analyze Product',
    cover: appLang === 'zh' ? '封面' : appLang === 'ms' ? 'Muka' : 'Cover',
    deleteConfirm: appLang === 'zh' ? '确认删除' : appLang === 'ms' ? 'Sahkan Padam' : 'Confirm Delete',
    deleteMessage: appLang === 'zh' ? '确认删除此照片？此操作不可逆。' : appLang === 'ms' ? 'Adakah anda pasti mahu memadamkan foto ini? Tindakan ini tidak dapat diubah.' : 'Are you sure you want to delete this photo? This action cannot be undone.',
    deleteLabel: appLang === 'zh' ? '删除' : appLang === 'ms' ? 'Padam' : 'Delete',
    cancelLabel: appLang === 'zh' ? '取消' : appLang === 'ms' ? 'Batal' : 'Cancel',
    analyzeError: appLang === 'zh' ? '识别异常' : appLang === 'ms' ? 'Gagal Kenal Pasti' : 'Identify Failed',
  };

  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3 min-h-[72px]">
      <div className="flex-none flex items-center gap-2">
        <div
          onClick={onToggleHidden}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${formState.is_hidden ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-green-50 border-green-200 text-green-600"}`}
        >
          {formState.is_hidden ? <EyeOff size={10} /> : <Eye size={10} />}
          <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
            {formState.is_hidden ? l.hidden : l.visible}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
        <h2 className="font-black text-sm text-slate-800 tracking-tight leading-tight uppercase truncate w-full text-center">
          {editPhotoId ? l.editTitle : l.analyzeTitle}
        </h2>
        <p className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">
        </p>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toast.info('点此一键智能提取照片各项参数')}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
            <Info size={14} />
          </button>
          <button
            onClick={onAiAnalyze}
            disabled={isAnalyzing || isRunning}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all disabled:opacity-50 ${isAnalyzing ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" : "bg-purple-50 text-purple-600 border-purple-100 active:bg-purple-200"}`}
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
              const newState = !formState.is_group_cover;
              form.setFieldValue('is_group_cover', newState);
              toast.success(newState ? '已设为封面' : '已取消封面');
            }}
            title={l.cover}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all ${formState.is_group_cover ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" : "bg-white text-amber-500 border-amber-200 hover:bg-amber-50 active:scale-95"}`}
          >
            <Star size={20} className={formState.is_group_cover ? "fill-white" : "fill-transparent"} />
          </button>
        )}

        {isPartOfGroup && (
          <button
            onClick={onRemoveFromGroup}
            title="移出合组"
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-200 active:scale-95 transition-all"
          >
            <LogOut size={18} />
          </button>
        )}

        {editPhotoId && (
          <button
            onClick={onDelete}
            disabled={isRunning}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 shadow-sm active:bg-red-100 transition-all font-bold disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        )}

        <button
          onClick={onSave}
          disabled={isSyncing || isRunning}
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all disabled:opacity-50 ${isSyncing || isRunning ? "bg-blue-400 text-white border-blue-400 cursor-wait" : "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 active:bg-blue-700"}`}
        >
          {isSyncing || isRunning ? (
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
