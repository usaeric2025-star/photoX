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
} from "lucide-react";
import { Skeleton } from "../../ui/Skeleton";
import { useUIStore } from "../../../store";
import { ProductFormData } from "../../../types";

interface HeaderProps {
  editPhotoId: string | null;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
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
  isRunning?: boolean;
}

export function DrawerHeader({
  editPhotoId,
  formState,
  updateForm,
  isAnalyzing,
  aiDebugInfo,
  isPartOfGroup,
  isSyncing,
  onAbort,
  onAiAnalyze,
  onDelete,
  onSave,
  onToggleHidden,
  onClose,
  onErrorClick,
  isRunning,
}: HeaderProps) {
  const update = useUIStore((s) => s.update);
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3 min-h-[72px]">
      <div className="flex-none flex items-center gap-2">
        {aiDebugInfo?.error ? (
          <div
            onClick={() => onErrorClick(aiDebugInfo.error)}
            className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-help max-w-[140px]"
          >
            <Skeleton className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
            <span className="truncate">
              {aiDebugInfo.error.includes("|")
                ? aiDebugInfo.error.split("|")[2] ||
                  aiDebugInfo.error.split("|")[1] ||
                  "识别失败"
                : aiDebugInfo.error}
            </span>
          </div>
        ) : (
          <div
            onClick={onToggleHidden}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${formState.is_hidden ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-green-50 border-green-200 text-green-600"}`}
          >
            {formState.is_hidden ? <EyeOff size={10} /> : <Eye size={10} />}
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
              {formState.is_hidden ? "屏蔽" : "显示"}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
        <h2 className="font-black text-sm text-slate-800 tracking-tight leading-tight uppercase truncate w-full text-center">
          {editPhotoId ? "编辑产品信息" : "分析新产品"}
        </h2>
        <p className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">
          {editPhotoId ? "Product Details" : "Analyze Product"}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <div className="flex items-center gap-1.5">
          {isAnalyzing && onAbort && (
            <button
              onClick={onAbort}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-sm"
            >
              <CloseIcon size={18} />
            </button>
          )}
          <button
            onClick={onAiAnalyze}
            disabled={(isAnalyzing && !onAbort) || isRunning}
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
            onClick={() =>
              updateForm({ is_group_cover: !formState.is_group_cover })
            }
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all ${formState.is_group_cover ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-500 border-slate-200 active:bg-slate-100"}`}
          >
            <div className="text-[10px] font-bold">封面</div>
          </button>
        )}

        {editPhotoId && onDelete && (
          <button
            onClick={() => {
              update({
                alertDialog: {
                  title: "确认删除",
                  message: "确定要删除此照片吗？此操作不可恢复。",
                  confirmLabel: "删除",
                  cancelLabel: "取消",
                  type: "danger",
                  onConfirm: () => onDelete(),
                },
              });
            }}
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
