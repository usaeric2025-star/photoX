import React, { useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared/Button';

interface LightboxFallbackProps {
  onClose: () => void;
  message?: string;
}

/**
 * [COMPONENT] LightboxFallback
 * Displayed when lightbox is opened but data fails to load or is empty.
 */
export const LightboxFallback = ({ onClose, message = '无法加载照片数据' }: LightboxFallbackProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) {
      ref.current.showModal();
    }
    return () => {
      if (ref.current && ref.current.open) {
        ref.current.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-0 p-0 border-0 bg-transparent flex h-full max-h-none w-full max-w-none items-center justify-center outline-none backdrop:bg-black/95 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col items-center justify-center p-6 w-full h-full relative animate-in fade-in duration-300">
        <button
          onClick={() => {
            if (ref.current) ref.current.close();
            onClose();
          }}
          className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center space-y-6 max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 mb-4 animate-bounce">
            <AlertCircle size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">预览失败</h3>
            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
          
          <div className="pt-4 flex flex-col gap-3">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black hover:bg-slate-100 rounded-2xl h-12 font-bold"
            >
              刷新应用
            </Button>
            <Button 
              variant="ghost"
              onClick={() => {
                if (ref.current) ref.current.close();
                onClose();
              }}
              className="w-full text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl h-12"
            >
              返回列表
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
