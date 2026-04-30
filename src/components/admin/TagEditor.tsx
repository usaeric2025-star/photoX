import React, { useState, useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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

interface TagEditorProps {
  tags: any[];
  selectedTagIds: string[];
  onToggleTag: (tag: any) => void;
  onUpdateTag: (id: string, name: string) => void;
  onDeleteTag: (id: string) => void;
  onQuickAdd: () => void;
  onRenameTagRequest?: (tag: any) => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({ 
  tags, selectedTagIds, onToggleTag, onUpdateTag, onDeleteTag, onQuickAdd, onRenameTagRequest 
}) => {
  const [activeActionTag, setActiveActionTag] = useState<any | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<any | null>(null);
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
    }, 350);
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pl-1">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">标签 / Tags</h3>
        <button type="button" onClick={onQuickAdd} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增 / NEW</button>
      </div>
      <div className="flex flex-wrap gap-2 pb-1 max-h-32 overflow-y-auto content-start">
        {Array.from(new Map(tags.map(t => [t.id, t])).values()).map((tag: any) => {
          const isSelected = selectedTagIds.map(String).includes(String(tag.id));
          return (
            <div key={tag.id} className="relative">
              <button 
                type="button"
                style={{ 
                  WebkitTouchCallout: 'none', 
                  WebkitUserSelect: 'none', 
                  userSelect: 'none',
                  touchAction: 'manipulation' // Prevents double-tap zoom delay
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none ${isSelected ? 'bg-black text-white border-black' : 'bg-slate-100 text-slate-800 border-transparent hover:bg-slate-200'}`}
              >
                #{tag.name}
              </button>
            </div>
          );
        })}
      </div>

      {activeActionTag && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-950/40 flex items-center justify-center p-6 backdrop-blur-sm cursor-pointer" 
          onClick={() => setActiveActionTag(null)}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setActiveActionTag(null); }}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-[240px] shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-sm font-black text-slate-900">#{activeActionTag.name}</span>
            </div>
            <div className="space-y-2">
                <button 
                  type="button"
                  className="w-full flex items-center justify-center gap-2 text-blue-600 bg-blue-50 font-bold py-3 rounded-2xl hover:bg-blue-100 active:scale-95 transition-all cursor-pointer" 
                  onClick={() => { 
                    if (onRenameTagRequest) {
                      onRenameTagRequest(activeActionTag);
                    } else {
                      // Fallback or legacy if needed
                      console.warn("onRenameTagRequest not provided");
                    }
                    setActiveActionTag(null); 
                  }}
                >
                   <Pencil size={18} /> 编辑 / Edit
                </button>
                <button 
                  type="button"
                  className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 font-bold py-3 rounded-2xl hover:bg-red-100 active:scale-95 transition-all cursor-pointer" 
                  onClick={() => { 
                    setConfirmDeleteTag(activeActionTag);
                    setActiveActionTag(null); 
                  }}
                >
                   <Trash2 size={18} /> 删除 / Delete
                </button>
            </div>
            <button 
              type="button"
              className="w-full text-slate-400 text-xs font-bold pt-2 active:text-slate-600 cursor-pointer" 
              onClick={() => setActiveActionTag(null)}
            >
              取消 / Cancel
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDeleteTag} onOpenChange={(open) => !open && setConfirmDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签 #{confirmDeleteTag?.name} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              取消 / CANCEL
            </AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive"
              onClick={() => {
                if (confirmDeleteTag) {
                  onDeleteTag(confirmDeleteTag.id);
                  setConfirmDeleteTag(null);
                }
              }}
            >
              确认删除 / DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
