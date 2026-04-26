import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface TagEditorProps {
  tags: any[];
  selectedTagIds: string[];
  onToggleTag: (tag: any) => void;
  onUpdateTag: (id: string, name: string) => void;
  onDeleteTag: (id: string) => void;
  onQuickAdd: () => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({ tags, selectedTagIds, onToggleTag, onUpdateTag, onDeleteTag, onQuickAdd }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pl-1">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">标签 / Tags</h3>
        <button onClick={onQuickAdd} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增 / NEW</button>
      </div>
      <div className="flex flex-wrap gap-2 pb-1 max-h-32 overflow-y-auto content-start">
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <div key={tag.id} className="relative group">
              <button 
                onClick={() => onToggleTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSelected ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                #{tag.name}
              </button>
              <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); const n = prompt("输入标签名称 (仅限英文单词):", tag.name); if(n && /^[a-zA-Z]+$/.test(n)) { if(n !== tag.name) onUpdateTag(tag.id, n); } else if(n) { alert("标签名称必须仅包含英文单词，不含空格、数字或特殊字符"); } }} className="bg-white p-0.5 rounded-full shadow border text-blue-600"><Pencil size={10}/></button>
                <button onClick={(e) => { e.stopPropagation(); if(confirm(`确定删除标签 #${tag.name}?`)) onDeleteTag(tag.id); }} className="bg-white p-0.5 rounded-full shadow border text-red-600"><Trash2 size={10}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
