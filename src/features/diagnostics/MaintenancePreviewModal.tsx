import React from 'react';
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/shared/Button";
import { PreviewResult } from "@/features/diagnostics/issueActions";

interface MaintenancePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  preview: PreviewResult | null;
  danger?: boolean;
  onConfirm: () => void;
}

export function MaintenancePreviewModal({
  open,
  onClose,
  title,
  preview,
  danger,
  onConfirm
}: MaintenancePreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${title} - 影响范围预览`}
      description={`系统分析发现有 ${preview?.affectedPhotos?.length || 0} 张照片关联了多于 3 个标签。请预览以下即将执行的保留与裁剪清理结果：`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed font-semibold">
          💡 注：系统已根据最优权重算法（置信度高 &gt; 用户手动添加 &gt; 系统默认）进行智能排序，并对多余部分进行物理移除。下方清晰呈现了每一张受影响的照片在清理前后的标签变化细节。
        </div>

        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
          {preview?.affectedPhotos?.map((photo: { photoId: string; photoName: string; keptTags?: string[]; removedTags?: string[] }) => (
            <div key={photo.photoId} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl p-3.5 transition-all flex flex-col gap-2">
              <span className="text-xs font-black text-slate-800 tracking-tight uppercase block">{photo.photoName}</span>
              <div className="flex flex-wrap gap-2.5 items-center">
                <div className="flex items-center gap-1.5 text-[10px] bg-green-50/80 border border-green-100 px-2.5 py-1 rounded-lg text-green-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  保留：{photo.keptTags && photo.keptTags.length > 0 ? photo.keptTags.join(' / ') : '无'}
                </div>
                {photo.removedTags && photo.removedTags.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] bg-red-50/80 border border-red-100 px-2.5 py-1 rounded-lg text-red-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    移除：{photo.removedTags.join(' / ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-9 px-4 font-semibold border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50"
          >
            取消
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="text-xs h-9 px-5 font-semibold rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90"
          >
            确认并开始批量清理
          </Button>
        </div>
      </div>
    </Modal>
  );
}
