import React, { useState, useRef } from 'react';
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
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = (tagId: string) => {
    pressTimer.current = setTimeout(() => {
      setEditingTagId(tagId);
    }, 600);
  };

  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pl-1">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">标签 / Tags</h3>
        <button onClick={onQuickAdd} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增 / NEW</button>
      </div>
      <div className="flex flex-wrap gap-2 pb-1 max-h-32 overflow-y-auto content-start" onClick={() => setEditingTagId(null)}>
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          const isEditing = editingTagId === tag.id;
          return (
            <div 
              key={tag.id} 
              className="relative"
              onMouseDown={() => startPress(tag.id)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(tag.id)}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingTagId(null); onToggleTag(tag); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSelected ? 'bg-black text-white border-black' : 'bg-slate-100 text-slate-800 border-transparent hover:bg-slate-200'}`}
              >
                #{tag.name}
              </button>
              {isEditing && (
                <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
                  <button onClick={(e) => { e.stopPropagation(); const n = prompt("输入标签名称 (仅限英文单词):", tag.name); if(n && /^[a-zA-Z]+$/.test(n)) { if(n !== tag.name) onUpdateTag(tag.id, n); } else if(n) { alert("标签名称必须仅包含英文单词，不含空格、数字或特殊字符"); } setEditingTagId(null); }} className="bg-white p-1 rounded-full shadow border text-blue-600"><Pencil size={12}/></button>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm(`确定删除标签 #${tag.name}?`)) onDeleteTag(tag.id); setEditingTagId(null); }} className="bg-white p-1 rounded-full shadow border text-red-600"><Trash2 size={12}/></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
