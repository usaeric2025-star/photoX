import React from 'react';
import { useError } from '../../context/ErrorContext';
import { Trash2 } from 'lucide-react';

export const ErrorLogViewer = () => {
  const { errors, clearErrors } = useError();

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">系統錯誤日誌 ({errors.length})</h3>
        {errors.length > 0 && (
          <button onClick={clearErrors} className="text-red-600 hover:text-red-800 p-1">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      {errors.length === 0 ? (
        <div className="text-xs text-slate-400 py-4 text-center italic">
          暂无错误记录
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {errors.map((error, index) => {
            const isAiError = error.message.includes('AI 識別失敗');
            return (
              <div key={index} className={`text-xs p-2 rounded border font-mono ${isAiError ? 'bg-purple-50 border-purple-100 text-purple-900' : 'bg-white border-red-100 text-red-900'}`}>
                <span className="text-gray-400 mr-2">[{new Date(error.timestamp).toLocaleTimeString()}]</span>
                <span className={isAiError ? 'font-black' : ''}>{error.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
