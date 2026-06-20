import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Layers, ImagePlus } from '@/components/ui/Icon';

interface UploadModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: 'single' | 'group') => void;
}

export function UploadModeDialog({ open, onOpenChange, onSelectMode }: UploadModeDialogProps) {
  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="选择上传模式">
      <div className="p-4 space-y-3">
        <button
          onClick={() => onSelectMode('single')}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <ImagePlus size={24} />
          </div>
          <div>
            <div className="font-semibold text-slate-800">单图上传</div>
            <div className="text-sm text-slate-500">单独上传照片，每张照片独立管理（旧模式）</div>
          </div>
        </button>

        <button
          onClick={() => onSelectMode('group')}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left"
        >
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-lg shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <div className="font-semibold text-slate-800">批量上传后合组</div>
            <div className="text-sm text-slate-500">建议商品展示使用，自动将此次上传的照片设为一个组</div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
