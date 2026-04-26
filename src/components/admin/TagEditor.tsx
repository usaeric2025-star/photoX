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
  const hasLongPressed = useRef<boolean>(false);

  const startPress = (tag: any) => {
    hasLongPressed.current = false;
    pressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      setActiveActionTag(tag);
    }, 400); // reduced from 500
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
        <button type="button" onClick={onQuickAdd} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增 / NEW</button>
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
              onTouchMove={endPress} /* cancel if sliding */
              onTouchCancel={endPress}
            >
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!hasLongPressed.current) {
                    onToggleTag(tag); 
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSelected ? 'bg-black text-white border-black' : 'bg-slate-100 text-slate-800 border-transparent hover:bg-slate-200'}`}
              >
                #{tag.name}
              </button>
            </div>
          );
        })}
      </div>

      {activeActionTag && (
        <div className="fixed inset-0 z-[200] bg-slate-950/40 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setActiveActionTag(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-[240px] shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-sm font-black text-slate-900">#{activeActionTag.name}</span>
            </div>
            <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-2 text-blue-600 bg-blue-50 font-bold py-3 rounded-2xl hover:bg-blue-100 active:scale-95 transition-all" onClick={() => { const n = prompt("输入标签名称 (仅限英文单词):", activeActionTag.name); if(n && /^[a-zA-Z]+$/.test(n)) { if(n !== activeActionTag.name) onUpdateTag(activeActionTag.id, n); } else if(n) { alert("标签名称必须仅包含英文单词，不含空格、数字或特殊字符"); } setActiveActionTag(null); }}>
                   <Pencil size={18} /> 编辑 / Edit
                </button>
                <button className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 font-bold py-3 rounded-2xl hover:bg-red-100 active:scale-95 transition-all" onClick={() => { if(confirm(`确定删除标签 #${activeActionTag.name}?`)) onDeleteTag(activeActionTag.id); setActiveActionTag(null); }}>
                   <Trash2 size={18} /> 删除 / Delete
                </button>
            </div>
            <button className="w-full text-slate-400 text-xs font-bold pt-2 active:text-slate-600" onClick={() => setActiveActionTag(null)}>取消 / Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
