import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';
import { useAdminUI } from '../../context/AdminContexts';

interface Dialog {
  title: string;
  message: string;
  onConfirm: () => void;
}

interface PromptDialog {
  title: string;
  placeholder: string;
  onSubmit: (val: string) => void;
}

export const Modals = ({
  promptValue, setPromptValue
}: any) => {
  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useAdminUI();
  return (
    <>
      <AnimatePresence>
        {confirmDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-white rounded-[24px] p-5 shadow-2xl overflow-hidden relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setConfirmDialog(null)}
                className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 mt-2 ${confirmDialog.danger ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                {confirmDialog.icon || <Trash2 size={24} />}
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-2">{confirmDialog.title || '確認操作'}</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {confirmDialog.cancelText || '取消'}
                </button>
                <button 
                  onClick={async () => {
                    const handler = confirmDialog.onConfirm;
                    setConfirmDialog(null); // Close immediately
                    if (handler) {
                      await handler();
                    }
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors ${confirmDialog.danger !== false ? 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
                >
                  {confirmDialog.confirmText || (confirmDialog.danger !== false ? '确认删除' : '确认')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {promptDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setPromptDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-white rounded-[24px] p-5 shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPromptDialog(null)}
                className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="font-bold text-slate-800 text-base mb-4 text-center">{promptDialog.title}</h3>
              <input 
                type="text"
                autoFocus
                placeholder={promptDialog.placeholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 mb-6"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && promptValue.trim()) {
                      promptDialog.onSubmit(promptValue);
                      setPromptDialog(null);
                      setPromptValue('');
                    }
                  }}
                />
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                      setPromptDialog(null);
                      setPromptValue('');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    if (promptValue.trim()) {
                      promptDialog.onSubmit(promptValue);
                      setPromptDialog(null);
                      setPromptValue('');
                    }
                  }}
                  disabled={!promptValue.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setAlertDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-white rounded-[24px] p-5 shadow-2xl overflow-hidden relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setAlertDialog(null)}
                className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="font-bold text-slate-800 text-base mb-2 mt-2">{alertDialog.title}</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {alertDialog.message}
              </p>
              <button 
                onClick={() => setAlertDialog(null)}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors"
              >
                确定
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

