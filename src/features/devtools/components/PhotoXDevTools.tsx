import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DevToolsPanel } from './DevToolsPanel';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface PhotoXDevToolsProps {
  onClose: () => void;
  isPublicMode?: boolean;
}

export function PhotoXDevTools({ onClose, isPublicMode = false }: PhotoXDevToolsProps) {
  const [activeTab, setActiveTab] = useState<'photoX' | 'query'>('photoX');

  const content = (
    <div className="fixed bottom-16 left-4 z-[99999] w-96 max-h-[70vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800">🛠️ PhotoX DevTools</span>
          {isPublicMode && (
            <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-600 rounded-full font-medium tracking-wide">
              公開模式
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tab 切換 */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('photoX')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'photoX'
              ? 'border-b-2 border-brand-navy text-brand-navy'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          PhotoX 狀態
        </button>
        <button
          onClick={() => setActiveTab('query')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'query'
              ? 'border-b-2 border-brand-navy text-brand-navy'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Query DevTools
        </button>
      </div>

      {/* 內容 */}
      <div className="p-4 overflow-y-auto max-h-[calc(70vh-100px)] flex-1 relative devtools-content-container">
        {activeTab === 'photoX' ? (
          <DevToolsPanel />
        ) : (
          <div style={{ height: '400px' }} className="relative -m-4">
            <ReactQueryDevtools initialIsOpen={true} buttonPosition="bottom-left" errorTypes={[]} position="bottom" client={undefined} />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.getElementById('portal-root') || document.body);
}
