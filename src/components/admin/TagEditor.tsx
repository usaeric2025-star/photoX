import React, { useState, useRef, useMemo } from 'react';
import { Pencil, Trash2, Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLongPress } from '../../hooks/useLongPress';
import { saveSettings } from '../../services/settingService';
import { useGalleryStore } from '../../store';
import { Tag } from '../../types';
import { useFeedback } from '../../hooks';

interface TagEditorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (tag: Tag) => void;
  onUpdateTag: (id: string, name: string) => void;
  onDeleteTag: (id: string) => void;
  onQuickAdd: () => void;
  onRenameTagRequest?: (tag: Tag) => void;
  showHotEffects?: boolean;
}

export const TagEditor: React.FC<TagEditorProps> = ({ 
  tags, selectedTagIds, onToggleTag, onUpdateTag, onDeleteTag, onQuickAdd, onRenameTagRequest,
  showHotEffects = false
}) => {
  const { setAlertDialog } = useGalleryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const { settings, setSettings } = useGalleryStore();
  const { showError } = useFeedback();
  
  const { startPress, endPress, cancelPress, handleTouchMove, hasLongPressed, activeItem: activeActionTag, setActiveItem: setActiveActionTag } = useLongPress(
      (tag) => setActiveActionTag(tag)
  );

  const togglePin = async (tagId: string) => {
    try {
      const pinnedTags = settings?.pinnedTags || [];
      const newPinned = pinnedTags.includes(tagId)
        ? pinnedTags.filter((id: string) => id !== tagId)
        : [...pinnedTags, tagId];
      
      const nextSettings = { ...settings, pinnedTags: newPinned };
      setSettings(nextSettings);
      await saveSettings(nextSettings);
    } catch (err) {
      showError(err, '切换置顶状态');
    }
  };

  const hotTagsSet = useMemo(() => {
    if (!showHotEffects) return new Set<string>();
    const count = settings?.hotTagsCount || 9;
    const pinned = settings?.pinnedTags || [];
    const set = new Set<string>(pinned);
    
    if (set.size < count && tags.length > 0) {
      const candidates = tags.filter(t => !set.has(String(t.id)));
      const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
      const needed = count - set.size;
      for (let i = 0; i < needed && i < sorted.length; i++) {
         set.add(String(sorted[i].id));
      }
    }
    return set;
  }, [settings?.hotTagsCount, settings?.pinnedTags, tags, showHotEffects]);

  const filteredTags = useMemo(() => {
    const list = (Array.from(new Map(tags.map(t => [t.id, t])).values()) as Tag[]).filter((tag: Tag) => 
      (tag.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    return list.sort((a, b) => {
      const aSelected = selectedTagIds.map(String).includes(String(a.id));
      const bSelected = selectedTagIds.map(String).includes(String(b.id));
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      const aPinned = (settings?.pinnedTags || []).includes(String(a.id));
      const bPinned = (settings?.pinnedTags || []).includes(String(b.id));
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aHot = hotTagsSet.has(String(a.id));
      const bHot = hotTagsSet.has(String(b.id));
      if (aHot && !bHot) return -1;
      if (!aHot && bHot) return 1;

      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [tags, searchTerm, settings?.pinnedTags, hotTagsSet, selectedTagIds]);

  return (
    <div className="space-y-2">
      <div className="space-y-2 mb-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none px-1">标签 / TAGS</h3>
        <div className="flex items-center gap-2 px-1 relative group">
          <input 
            type="text"
            placeholder="搜索标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-[10px] focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1 bg-white/80 rounded-full shadow-sm"
            >
              <X size={12} />
            </button>
          )}
          <button type="button" onClick={onQuickAdd} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100 active:bg-blue-100 transition-colors">+ 新增</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pb-1 max-h-48 overflow-y-auto content-start">
        {filteredTags.map((tag: Tag) => {
          const isSelected = selectedTagIds.map(String).includes(String(tag.id));
          const isHot = hotTagsSet.has(String(tag.id));
          const isPinned = (settings?.pinnedTags || []).includes(String(tag.id));
          const isDisabled = !isSelected && selectedTagIds.length >= 3;

          return (
            <div key={tag.id} className="relative">
              <button 
                type="button"
                style={{ 
                  WebkitTouchCallout: 'none', 
                  WebkitUserSelect: 'none', 
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onMouseDown={(e) => startPress(tag, e)}
                onMouseUp={endPress}
                onMouseLeave={cancelPress}
                onTouchStart={(e) => startPress(tag, e)}
                onTouchEnd={endPress}
                onTouchMove={handleTouchMove}
                onTouchCancel={cancelPress}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  e.preventDefault();
                  if (!hasLongPressed.current) {
                    onToggleTag(tag); 
                  }
                }}
                className={cn(
                  "px-3 py-2 rounded-lg text-[11px] font-bold transition-all border select-none flex items-center gap-1.5 w-auto shadow-sm min-h-[44px] active:scale-95",
                  isSelected 
                    ? "bg-blue-600 text-white border-blue-600 z-10" 
                    : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 active:bg-slate-50",
                  isHot && !isSelected && "border-amber-300 bg-amber-50 text-amber-800",
                  isHot && isSelected && "ring-2 ring-amber-400",
                  isDisabled && "opacity-30 grayscale saturate-50"
                )}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isSelected ? "bg-white" : (isHot ? "bg-amber-400" : "bg-slate-300")
                )} />
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                  #{tag.name}
                </span>
                {isPinned && !isSelected && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full scale-90 origin-left font-black tracking-tighter shadow-sm"><Heart size={8} className="fill-white"/> 置顶</span>}
                {isHot && !isPinned && !isSelected && <span className="text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full scale-90 origin-left font-black tracking-tighter">HOT</span>}
              </button>
            </div>
          );
        })}
      </div>


      {activeActionTag && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-950/20 flex items-center justify-center p-6 backdrop-blur-md cursor-pointer animate-in fade-in duration-300" 
          onClick={() => setActiveActionTag(null)}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setActiveActionTag(null); }}
        >
          <div className="glass-morphism rounded-3xl p-8 w-full max-w-[280px] shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">标签管理 / TAG</span>
              <div className="text-lg font-black text-slate-900">#{activeActionTag.name}</div>
            </div>
            <div className="space-y-3">
                <button 
                  type="button"
                  className="w-full flex items-center justify-center gap-3 text-amber-600 bg-amber-50/50 backdrop-blur-sm border border-amber-100/50 font-bold py-4 rounded-2xl hover:bg-amber-100 transition-all cursor-pointer shadow-sm shadow-amber-500/5" 
                  onClick={() => { 
                    togglePin(String(activeActionTag.id));
                    setActiveActionTag(null); 
                  }}
                >
                   <Heart size={18} strokeWidth={2.5} className={(settings?.pinnedTags || []).includes(String(activeActionTag.id)) ? "fill-amber-600" : ""} /> 
                   {(settings?.pinnedTags || []).includes(String(activeActionTag.id)) ? '取消置顶 / Unpin' : '设为置顶 / Pin as Hot'}
                </button>
                <button 
                  type="button"
                  className="w-full flex items-center justify-center gap-3 text-blue-600 bg-blue-50/50 backdrop-blur-sm border border-blue-100/50 font-bold py-4 rounded-2xl hover:bg-blue-100 transition-all cursor-pointer shadow-sm shadow-blue-500/5" 
                  onClick={() => { 
                    if (onRenameTagRequest) {
                      onRenameTagRequest(activeActionTag);
                    }
                    setActiveActionTag(null); 
                  }}
                >
                   <Pencil size={18} strokeWidth={2.5} /> 编辑名称 / Rename
                </button>
                <button 
                  type="button"
                  className="w-full flex items-center justify-center gap-3 text-red-600 bg-red-50/50 backdrop-blur-sm border border-red-100/50 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all cursor-pointer shadow-sm shadow-red-500/5" 
                  onClick={() => { 
                    setAlertDialog({
                      title: `彻底删除标签 / Permanent Delete: #${activeActionTag.name}`,
                      message: '无法撤销且会从所有照片中移除 / This will be permanently removed from all photos.',
                      onConfirm: () => onDeleteTag(activeActionTag.id),
                      confirmLabel: '删除',
                      type: 'danger'
                    });
                    setActiveActionTag(null); 
                  }}
                >
                   <Trash2 size={18} strokeWidth={2.5} /> 彻底删除 / Delete
                </button>
            </div>
            <button 
              type="button"
              className="w-full text-slate-400 text-[10px] font-black uppercase tracking-tighter pt-2 active:text-slate-600 cursor-pointer" 
              onClick={() => setActiveActionTag(null)}
            >
              取消操作 / CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Redundant AlertDialog removed since onDeleteTag uses the unified useDelete hook which has its own dialog */}
    </div>
  );
};
