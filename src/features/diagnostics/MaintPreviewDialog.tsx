import React from 'react';
import { Modal } from "#src/components/ui/Modal.js";
import { Button } from "#src/components/ui/Button.js";
import { PreviewResult } from "./issueActions.js";

interface MaintPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  preview: PreviewResult | null;
  danger?: boolean;
  onConfirm: () => void;
}

/**
 * MaintPreviewDialog
 * 
 * 維護操作執行前的預覽對話框，展示受影響的數據詳情。
 */
export function MaintPreviewDialog({
  open,
  onClose,
  title,
  preview,
  danger,
  onConfirm
}: MaintPreviewDialogProps) {
  return (
    <Modal
      id="maintenance-preview-dialog"
      open={open}
      onClose={onClose}
      title={`${title} - 影响范围预览`}
      description={`系统分析发现有 ${preview?.affectedPhotos?.length || 0} 张照片可能受影响。请预览以下即将执行的变更：`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed font-semibold">
          💡 注：请仔细检查变更范围，部分操作一旦执行可能无法撤销。
        </div>
        
        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
          {preview?.affectedPhotos?.map((photo) => (
            <div key={photo.photoId} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-xl p-3.5 transition-all flex flex-col gap-2">
              <span className="text-xs font-black text-slate-800 tracking-tight uppercase block">{photo.photoName}</span>
              <div className="flex flex-wrap gap-2.5 items-center">
                {photo.keptTags && Array.isArray(photo.keptTags) && photo.keptTags.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] bg-green-50/80 border border-green-100 px-2.5 py-1 rounded-lg text-green-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    保留：{photo.keptTags.join(' / ')}
                  </div>
                )}
                {photo.removedTags && Array.isArray(photo.removedTags) && photo.removedTags.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] bg-red-50/80 border border-red-100 px-2.5 py-1 rounded-lg text-red-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    移除：{photo.removedTags.join(' / ')}
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!preview?.affectedPhotos || preview.affectedPhotos.length === 0) && (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              暂无具体受影响的照片明细，仅有统计数据
            </div>
          )}
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
            className="text-xs h-9 px-5 font-semibold rounded-xl"
          >
            确认并执行变更
          </Button>
        </div>
      </div>
    </Modal>
  );
}
