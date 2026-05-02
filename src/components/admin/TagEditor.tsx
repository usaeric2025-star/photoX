import React, { useState, useRef, useMemo } from 'react';
import { Pencil, Trash2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useErrorHandler } from '../../utils/errorHandler';
import { saveSettings } from '../../services/supabaseService';
import { useAdminSession } from '../../context/AdminContexts';

interface TagEditorProps {
  tags: any[];
  selectedTagIds: string[];
  onToggleTag: (tag: any) => void;
  onUpdateTag: (id: string, name: string) => void;
  onDeleteTag: (id: string) => void;
  onQuickAdd: () => void;
  onRenameTagRequest?: (tag: any) => void;
  showHotEffects?: boolean;
}

export const TagEditor: React.FC<TagEditorProps> = ({ 
  tags, selectedTagIds, onToggleTag, onUpdateTag, onDeleteTag, onQuickAdd, onRenameTagRequest,
  showHotEffects = false
}) => {
  const { handleError } = useErrorHandler();
  const [activeActionTag, setActiveActionTag] = useState<any | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasLongPressed = useRef<boolean>(false);

  const activeTouchId = useRef<number | null>(null);
  const touchStartPoint = useRef<{x: number, y: number} | null>(null);

  const startPress = (tag: any, e?: React.TouchEvent | React.MouseEvent) => {
    hasLongPressed.current = false;
    
    if (e && 'touches' in e) {
      activeTouchId.current = e.touches[0].identifier;
      touchStartPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      activeTouchId.current = null;
      touchStartPoint.current = null;
    }

    pressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      setActiveActionTag(tag);
    }, 700);
  };

  const clearTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const cancelPress = () => {
    clearTimer();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPoint.current) return;
    const touchList = Array.from(e.changedTouches) as React.Touch[];
    const touch = touchList.find(t => t.identifier === activeTouchId.current);
    if (!touch) return;
    
    const dx = touch.clientX - touchStartPoint.current.x;
    const dy = touch.clientY - touchStartPoint.current.y;
    if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
      cancelPress();
    }
  };

  const endPress = () => {
    clearTimer();
    activeTouchId.current = null;
    touchStartPoint.current = null;
  };

  const { settings, setSettings } = useAdminSession();

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
      handleError(err, '切換置頂狀態失敗');
    }
  };

  const hotTagsSet = useMemo(() => {
    if (!showHotEffects) return new Set<string>();
    const count = settings?.hotTagsCount || 9;
    const pinned = settings?.pinnedTags || [];
    const set = new Set<string>(pinned);
    
    if (set.size < count && tags.length > 0) {
      const candidates = tags.filter(t => !set.has(String(t.id)));
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      const needed = count - set.size;
      for (let i = 0; i < needed && i < shuffled.length; i++) {
         set.add(String(shuffled[i].id));
      }
    }
    return set;
  }, [settings?.hotTagsCount, settings?.pinnedTags, tags, showHotEffects]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">標籤 / TAGS</h3>
        <button type="button" onClick={onQuickAdd} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 active:bg-blue-100 transition-colors">+ 新增</button>
      </div>
      <div className="flex flex-wrap gap-2 pb-1 max-h-32 overflow-y-auto content-start">
        {Array.from(new Map(tags.map(t => [t.id, t])).values()).map((tag: any) => {
          const isSelected = selectedTagIds.map(String).includes(String(tag.id));
          const isHot = hotTagsSet.has(String(tag.id));
          const isPinned = (settings?.pinnedTags || []).includes(String(tag.id));

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
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border select-none flex items-center gap-1.5 w-auto",
                  isSelected 
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 z-10" 
                    : "bg-white/60 text-slate-600 border-slate-200/50 hover:bg-white hover:border-slate-300 hover:text-slate-800 active:bg-slate-50",
                  isHot && !isSelected && "border-amber-200/50 bg-amber-50/30 text-amber-700/80 hot-tag-breath",
                  isHot && isSelected && "ring-2 ring-amber-400/30"
                )}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSelected ? (showHotEffects ? "bg-amber-400 animate-pulse" : "bg-slate-400") : (isHot ? "bg-amber-400/60" : "bg-slate-300")
                )} />
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                  #{tag.name}
                </span>
                {isPinned && !isSelected && <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full scale-75 origin-left font-black tracking-tighter shadow-sm flex items-center pl-1 gap-0.5"><Heart size={8} className="fill-white"/> 置顶</span>}
                {isHot && !isPinned && !isSelected && <span className="text-[8px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full scale-75 origin-left font-black tracking-tighter">HOT</span>}
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
                    onDeleteTag(activeActionTag.id);
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
