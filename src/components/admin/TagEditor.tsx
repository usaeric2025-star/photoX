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
  const [activeActionTag, setActiveActionTag] = useState<any | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = (tag: any) => {
    pressTimer.current = setTimeout(() => {
      setActiveActionTag(tag);
    }, 500);
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
      <div className="flex flex-wrap gap-2 pb-1 max-h-32 overflow-y-auto content-start">
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <div 
              key={tag.id} 
              className="relative"
              onMouseDown={() => startPress(tag)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(tag)}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleTag(tag); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSelected ? 'bg-black text-white border-black' : 'bg-slate-100 text-slate-800 border-transparent hover:bg-slate-200'}`}
              >
                #{tag.name}
              </button>
            </div>
          );
        })}
      </div>

      {activeActionTag && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setActiveActionTag(null)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-[200px] shadow-xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-center font-bold text-slate-800 pb-2 border-b">#{activeActionTag.name}</p>
            <button className="w-full text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50" onClick={() => { const n = prompt("输入标签名称 (仅限英文单词):", activeActionTag.name); if(n && /^[a-zA-Z]+$/.test(n)) { if(n !== activeActionTag.name) onUpdateTag(activeActionTag.id, n); } else if(n) { alert("标签名称必须仅包含英文单词，不含空格、数字或特殊字符"); } setActiveActionTag(null); }}>编辑</button>
            <button className="w-full text-red-600 font-medium py-2 rounded-lg hover:bg-red-50" onClick={() => { if(confirm(`确定删除标签 #${activeActionTag.name}?`)) onDeleteTag(activeActionTag.id); setActiveActionTag(null); }}>删除</button>
          </div>
        </div>
      )}
    </div>
  );
};
