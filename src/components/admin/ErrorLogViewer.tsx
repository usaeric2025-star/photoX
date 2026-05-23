import React from 'react';
import { useGalleryStore } from '../../store';
import { Trash2, Download } from 'lucide-react';
import { useFeedback } from '../../hooks';

export const ErrorLogViewer = () => {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-brand-navy/10 mt-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系统错误与操作日志 / System Logs
        </h3>
      </div>
      <div className="text-xs text-slate-400 py-4 text-center italic">
        日志组件已停用。
      </div>
    </div>
  );
};
