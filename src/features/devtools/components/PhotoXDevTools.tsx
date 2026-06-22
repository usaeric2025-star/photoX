import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DevToolsPanel } from './DevToolsPanel';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';

interface PhotoXDevToolsProps {
  onClose: () => void;
  isPublicMode?: boolean;
}

export function PhotoXDevTools({ onClose, isPublicMode = false }: PhotoXDevToolsProps) {
  const [activeTab, setActiveTab] = useState<'photoX' | 'query'>('photoX');
  const [isMinimized, setIsMinimized] = useState(false);
  const queryClient = useQueryClient();

  // Try to restore saved position, fallback to safe defaults (bottom left, out of the way)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('photox_devtools_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Verify fits inside current screen
          const validX = Math.max(10, Math.min(window.innerWidth - 100, parsed.x));
          const validY = Math.max(10, Math.min(window.innerHeight - 50, parsed.y));
          return { x: validX, y: validY };
        }
      }
    } catch (_) {}
    return { x: 16, y: window.innerHeight - 512 };
  });

  const dragStart = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  // Keep saved position synchronized
  useEffect(() => {
    try {
      localStorage.setItem('photox_devtools_pos', JSON.stringify(position));
    } catch (_) {}
  }, [position]);

  // Adjust coordinates if window is resized to keep inside boundaries
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const nextX = Math.max(10, Math.min(window.innerWidth - 100, prev.x));
        const nextY = Math.max(10, Math.min(window.innerHeight - 50, prev.y));
        return { x: nextX, y: nextY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Only trigger drag on elements marked with drag-handle, avoiding clickable buttons
    if (target.closest('.drag-handle') && !target.closest('.no-drag')) {
      e.preventDefault();
      dragStart.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      const dragEl = target.closest('.drag-element') || target;
      try {
        dragEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.startX;
    const dy = e.clientY - dragStart.current.startY;
    
    // Bounds boundaries check
    const maxX = window.innerWidth - (isMinimized ? 60 : 380);
    const maxY = window.innerHeight - (isMinimized ? 60 : 250);
    
    let nextX = dragStart.current.posX + dx;
    let nextY = dragStart.current.posY + dy;
    
    nextX = Math.max(10, Math.min(maxX, nextX));
    nextY = Math.max(10, Math.min(maxY, nextY));
    
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart.current) {
      const target = e.target as HTMLElement;
      try {
        const dragEl = target.closest('.drag-element') || target;
        dragEl.releasePointerCapture(e.pointerId);
      } catch (_) {}
      dragStart.current = null;
    }
  };

  // State inspection for custom queries inspector
  const queries = queryClient.getQueryCache().getAll();
  const [selectedQueryKey, setSelectedQueryKey] = useState<string | null>(null);

  const isQueryFetching = (q: any) => {
    return q.state?.fetchStatus === 'fetching';
  };

  const isQueryStale = (q: any) => {
    return q.state?.isInvalidated || !q.state?.dataUpdatedAt;
  };

  const inlineContent = isMinimized ? (
    /* Minimized Floating Badge Bubble */
    <div
      className="drag-element fixed select-none flex items-center justify-center bg-brand-navy hover:bg-slate-800 text-white rounded-full shadow-2xl transition-transform active:scale-95 border border-white/10"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '52px',
        height: '52px',
        cursor: 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="drag-handle relative w-full h-full flex items-center justify-center group">
        <span className="text-xl">🛠️</span>
        {queries.filter(q => isQueryFetching(q)).length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white animate-pulse">
            {queries.filter(q => isQueryFetching(q)).length}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="no-drag absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/60 rounded-full transition-opacity cursor-pointer animate-fade-in"
          title="展開面板"
        >
          <Icon name="maximize-2" className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  ) : (
    /* Expanded DevTools Panel Box */
    <div
      className="drag-element fixed select-none flex flex-col bg-white border border-slate-205 rounded-2xl shadow-xl overflow-hidden focus:outline-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        maxHeight: '480px',
        touchAction: 'none',
      }}
    >
      {/* 標題及 Drag Handle */}
      <div
        className="drag-handle flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100"
        style={{ cursor: 'move' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>🛠️</span>
            <span>PhotoX 內部診斷儀</span>
          </span>
          {isPublicMode && (
            <span className="px-1.5 py-0.5 text-[9px] bg-slate-200 text-slate-600 rounded-md font-semibold">
              公開
            </span>
          )}
        </div>
        <div className="no-drag flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            title="最小化"
          >
            <Icon name="minimize-2" className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer font-bold"
            title="關閉"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          type="button"
          onClick={() => setActiveTab('photoX')}
          className={`flex-1 px-4 py-2 text-xs font-semibold tracking-wide transition-colors cursor-pointer border-b-2 ${
            activeTab === 'photoX'
              ? 'border-brand-navy text-brand-navy bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          PhotoX 狀態診斷
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('query')}
          className={`flex-1 px-4 py-2 text-xs font-semibold tracking-wide tracking-tight transition-colors cursor-pointer border-b-2 ${
            activeTab === 'query'
              ? 'border-brand-navy text-brand-navy bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          比對 Query 快取 ({queries.length})
        </button>
      </div>

      {/* 內容區塊 */}
      <div className="p-4 overflow-y-auto flex-1 bg-white min-h-[250px] max-h-[360px]">
        {activeTab === 'photoX' ? (
          <DevToolsPanel />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">快取資料庫列表</span>
              <button
                type="button"
                onClick={() => {
                  queryClient.invalidateQueries();
                }}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                全部重新整理
              </button>
            </div>
            
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {queries.map((q, idx) => {
                const keyStr = JSON.stringify(q.queryKey);
                const isSelected = selectedQueryKey === keyStr;
                const activeFetching = isQueryFetching(q);
                const activeStale = isQueryStale(q);
                return (
                  <div key={idx} className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/40 hover:bg-slate-50 transition-all">
                    <div 
                      onClick={() => setSelectedQueryKey(isSelected ? null : keyStr)}
                      className="flex items-center justify-between p-2.5 cursor-pointer select-none text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          activeFetching ? 'bg-blue-500 animate-pulse' : activeStale ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <span className="font-mono text-[11px] text-slate-800 truncate block">
                          {keyStr}
                        </span>
                      </div>
                      <Icon name={isSelected ? 'chevron-up' : 'chevron-down'} className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </div>
                    {isSelected && (
                      <div className="p-2.5 bg-white border-t border-slate-100 space-y-2 text-[11px]">
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div>
                            <span className="text-slate-400">狀態: </span>
                            <span className="font-semibold text-slate-750">
                              {activeFetching ? '進行中 (fetching)' : activeStale ? '過期 (stale)' : '最新 (fresh)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">更新於: </span>
                            <span className="font-mono">
                              {q.state?.dataUpdatedAt ? new Date(q.state.dataUpdatedAt).toLocaleTimeString() : '從未'}
                            </span>
                          </div>
                        </div>

                        {/* Data inspector panel */}
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">預覽快取 JSON:</span>
                          <pre className="p-2 bg-slate-50 rounded-lg text-[10px] font-mono overflow-auto max-h-[120px] whitespace-pre border border-slate-100 text-slate-700">
                            {q.state?.data ? JSON.stringify(q.state.data, null, 2) : '無資料'}
                          </pre>
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-slate-50">
                          <button
                            type="button"
                            onClick={() => {
                              queryClient.refetchQueries({ queryKey: q.queryKey });
                            }}
                            className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            重新載入數據
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              queryClient.invalidateQueries({ queryKey: q.queryKey });
                            }}
                            className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-705 font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            設為過期 (Stale)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {queries.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  暫無快取 Query 項
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(inlineContent, document.getElementById('portal-root') || document.body);
}
