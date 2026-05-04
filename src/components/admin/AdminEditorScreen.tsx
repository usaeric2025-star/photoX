import React from 'react';
import { X, Sparkles } from 'lucide-react';
import PhotoEditor from '../PhotoEditor';

export function AdminEditorScreen({
  setActiveScreen
}: { setActiveScreen: (s: string) => void }) {
  return (
    <div className="flex flex-col fixed inset-0 bg-[#F8FAFC] z-[120] overflow-hidden">
      <div className="h-full flex flex-col p-4 md:p-6 lg:p-8">
        <header className="mb-6 flex justify-between items-end shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Sparkles size={18} />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">海报实验室 / <span className="text-blue-600">AD LAB</span></h1>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-11">Creative Marketing Visuals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right mr-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当前画布</div>
              <div className="text-xs font-bold text-slate-600">1080 x 1080 (Square)</div>
            </div>
            <button 
              onClick={() => setActiveScreen('home')}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 flex items-center justify-center hover:text-red-500 hover:border-red-100 transition-all shadow-sm active:scale-95 group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </header>
        
        <div className="flex-1 min-h-0 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
           <div className="absolute inset-0 overflow-auto p-6">
             <PhotoEditor />
           </div>
        </div>
      </div>
    </div>
  );
}
