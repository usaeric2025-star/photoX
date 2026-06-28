import React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { Icon } from '@/components/ui/Icon';

interface UploadModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: 'single' | 'group') => void;
}

export function UploadModeDialog({ open, onOpenChange, onSelectMode }: UploadModeDialogProps) {
  return (
    <NativeDialog id="upload-mode-dialog" open={open} onClose={() => onOpenChange(false)} title="选择上传模式">
      <div className="p-4 space-y-3">
        <button
          onClick={() => onSelectMode('single')}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <Icon name="image-plus" size={24} />
          </div>
          <div>
            <div className="font-semibold text-slate-800">常规上传</div>
            <div className="text-sm text-slate-500">单独上传多张照片，各自独立管理。</div>
          </div>
        </button>

        <button
          onClick={() => onSelectMode('group')}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left"
        >
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-lg shrink-0">
            <Icon name="layers" size={24} />
          </div>
          <div>
            <div className="font-semibold text-slate-800">创建商品组</div>
            <div className="text-sm text-slate-500">将多张照片合并为一个商品，统一管理。</div>
          </div>
        </button>
      </div>
    </NativeDialog>
  );
}
