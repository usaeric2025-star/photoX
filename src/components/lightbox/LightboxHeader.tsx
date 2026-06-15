import { Info, X } from 'lucide-react';

interface LightboxHeaderProps {
  title?: string;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onInfo: () => void;
  showInfo: boolean;
}

export function LightboxHeader({ title, currentIndex, total, onClose, onInfo, showInfo }: LightboxHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 z-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
      <div className="text-white pointer-events-auto">
        <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-sm font-medium tracking-wide">
          {currentIndex + 1} <span className="opacity-50 mx-1">/</span> {total}
        </div>
      </div>
      <div className="flex gap-2 pointer-events-auto">
        <button onClick={onInfo} className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-white text-black' : 'text-white bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10'}`}>
          <Info className="w-5 h-5" />
        </button>
        <button onClick={onClose} className="p-2 text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
