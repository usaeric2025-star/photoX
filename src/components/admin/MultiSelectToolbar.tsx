import React from 'react';
import { Sparkles, Trash2, Layers, X, Edit3 } from 'lucide-react';

interface Props {
  selectedCount: number;
  onClose: () => void;
  onBatchAiIdentify: () => void;
  onBatchEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
}

export const MultiSelectToolbar: React.FC<Props> = ({
  selectedCount, onClose,
  onBatchAiIdentify, onBatchEdit, onGroup, onDelete
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-white/90 backdrop-blur-md shadow-2xl p-2 rounded-2xl border border-blue-100 flex items-center gap-1">
      <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
      <div className="px-2 font-bold text-blue-600 text-sm">{selectedCount}</div>
      <div className="h-6 w-px bg-slate-200 mx-1" />
      <button onClick={onBatchAiIdentify} className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl" title="AI Identify"><Sparkles size={20} /></button>
      <button onClick={onBatchEdit} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl" title="Edit"><Edit3 size={20} /></button>
      <button onClick={onGroup} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl" title="Group"><Layers size={20} /></button>
      <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-xl" title="Delete"><Trash2 size={20} /></button>
    </div>
  );
};
