import React from 'react';
import { X, RefreshCcw, Save, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';

export const FormHeader: React.FC<{
  onClose: () => void;
  editPhotoId: string | null;
  newPhotoData: string | null;
  isAnalyzing: boolean;
  abortAnalysis?: () => void;
  withLoading: (type: string, fn: () => Promise<any>) => void;
  handleSingleAiAnalyze: (data: string | null, catId?: string) => Promise<any>;
  formState: any;
  updateForm: (updates: any) => void;
  saveNewPhoto: () => void;
  isSyncing: boolean;
  deletePhoto: (id: string) => void;
  setAlertDialog: (d: any) => void;
  t: any;
}> = ({ onClose, editPhotoId, newPhotoData, isAnalyzing, abortAnalysis, withLoading, handleSingleAiAnalyze, formState, updateForm, saveNewPhoto, isSyncing, deletePhoto, setAlertDialog, t }) => {
  return (
    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm relative min-h-[72px]">
        <div className="flex-1"></div>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight pointer-events-auto">{editPhotoId ? t.editProduct : t.addProduct}</h2>
            <div 
              onClick={() => updateForm({ isHidden: !formState.isHidden })}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border cursor-pointer mt-1 pointer-events-auto ${formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {formState.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="text-[8px] font-bold uppercase tracking-widest">{formState.isHidden ? '公开屏蔽中' : '公开显示中'}</span>
            </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {!editPhotoId && newPhotoData && (
            <button 
                onClick={() => {
                  if (isAnalyzing) return;
                  withLoading('analyzing', () => handleSingleAiAnalyze(newPhotoData, formState.categoryId || undefined));
                }}
                disabled={isAnalyzing && !abortAnalysis}
                className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm ${isAnalyzing ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100 active:bg-purple-200'}`}
            >
              {isAnalyzing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>
          )}
          {editPhotoId && (
            <button 
              onClick={() => {
                setAlertDialog({
                  title: '确认删除产品',
                  message: '确定要删除这张照片吗？此操作无法撤销。',
                  onConfirm: () => {
                    if (editPhotoId) deletePhoto(editPhotoId);
                  }
                });
              }}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={saveNewPhoto}
            disabled={isSyncing}
            className={`bg-slate-800 text-white w-10 h-10 rounded-2xl shadow-lg shadow-slate-800/10 transition-all flex items-center justify-center ${isSyncing ? 'opacity-50' : 'active:bg-slate-700'}`}
          >
            {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 rounded-full ml-1">
            <X size={20} />
          </button>
        </div>
    </div>
  );
};
