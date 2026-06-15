import type { LightboxItem } from './types';
import { X, Camera, Aperture, Clock, Activity, Edit3 } from 'lucide-react';

interface LightboxInfoProps {
  item: LightboxItem;
  show: boolean;
  onClose: () => void;
  onEdit?: () => void;
  isMobile: boolean;
}

export function LightboxInfo({ item, show, onClose, onEdit, isMobile }: LightboxInfoProps) {
  if (!show) return null;

  // 行動端：底部上滑面板
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white rounded-t-2xl p-4 z-50 max-h-[60vh] overflow-auto border-t border-white/10 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-lg leading-tight pr-4">{item.title}</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          {item.description && <p className="text-slate-300 text-sm mb-4 leading-relaxed">{item.description}</p>}
          {item.exif && renderExif(item.exif)}
          {onEdit && (
            <button onClick={onEdit} className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm font-medium">
              <Edit3 className="w-4 h-4" />
              編輯照片詳細資訊
            </button>
          )}
        </div>
      </>
    );
  }

  // 桌面端：右側滑入面板
  return (
    <div className={`fixed top-0 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-2xl text-white border-l border-white/10 shadow-2xl z-40 transition-transform duration-300 ease-out flex flex-col ${show ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <h3 className="font-bold text-lg">照片資訊</h3>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">
        <h4 className="font-medium text-lg leading-snug text-white/90 mb-2">{item.title}</h4>
        {item.description && <p className="text-slate-400 text-sm leading-relaxed mb-6">{item.description}</p>}
        {item.exif && renderExif(item.exif)}
      </div>
      {onEdit && (
        <div className="p-4 border-t border-white/10 bg-black/20">
          <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors rounded-xl text-sm font-medium">
            <Edit3 className="w-4 h-4" />
            編輯標籤與資訊
          </button>
        </div>
      )}
    </div>
  );
}

function renderExif(exif?: LightboxItem['exif']) {
  if (!exif) return null;
  return (
    <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
      {exif.camera && (
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Camera className="w-4 h-4 text-slate-500" />
          <span className="font-medium">{exif.camera}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
        {exif.focalLength && (
          <div className="flex items-center gap-2">
            <div className="w-4 flex justify-center"><span className="text-[10px] font-bold text-slate-500">mm</span></div>
            {exif.focalLength}mm
          </div>
        )}
        {exif.aperture && (
          <div className="flex items-center gap-2">
            <Aperture className="w-4 h-4 text-slate-500" />
            f/{exif.aperture}
          </div>
        )}
        {exif.shutterSpeed && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            {exif.shutterSpeed}s
          </div>
        )}
        {exif.iso && (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            ISO {exif.iso}
          </div>
        )}
      </div>
    </div>
  );
}
