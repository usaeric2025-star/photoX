import { Icon } from '#src/components/ui/Icon';
import { toast } from 'sonner';

interface LightboxHeaderProps {
  currentPhoto: any;
  currentIndex: number;
  totalPhotos: number;
  showInfo: boolean;
  isAdmin: boolean;
  onToggleInfo: () => void;
  onEdit: (photoData: any) => void;
  onClose: () => void;
}

export function LightboxHeader({
  currentPhoto,
  currentIndex,
  totalPhotos,
  showInfo,
  isAdmin,
  onToggleInfo,
  onEdit,
  onClose
}: LightboxHeaderProps) {
  const photoData = (currentPhoto.original || currentPhoto) as any;
  const descriptionObj = photoData?.description;
  const hasDescription = !!descriptionObj;
  
  return (
    <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-start justify-between z-[150] pointer-events-none">
      {/* Left: Counter */}
      <div className="flex items-center gap-3">
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/80 border border-white/10  flex items-center gap-2 shadow-2xl pointer-events-auto transition-transform">
          <span className="text-xs sm:text-sm font-medium text-white/90 font-mono tracking-wider">
            {String(currentIndex + 1).padStart(2, '0')}
            <span className="text-white/30 mx-1">/</span>
            {String(totalPhotos).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(photoData); }}
            className="h-10 sm:h-11 px-4 sm:px-5 bg-blue-600/20 text-blue-400 active:bg-blue-600 active:text-white rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-2xl  transition-all active:scale-95 flex items-center gap-2 border border-blue-500/20 uppercase"
          >
            <span>✏️</span>
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleInfo();
          }}
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border  flex items-center justify-center transition-all active:scale-90 shadow-2xl ${
            showInfo 
              ? 'bg-white text-black border-white' 
              : 'bg-black/80 border-white/10 text-white active:bg-black/60'
          }`}
          title="Toggle Info"
        >
          <Icon name="info" className={`h-4 w-4 sm:h-5 sm:w-5 ${hasDescription && !showInfo ? 'text-blue-400' : ''}`} />
          {hasDescription && !showInfo && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const key = photoData.imageUrl || photoData.uri || (currentPhoto as any).src;
            if (key) {
              const url = new URL(key, window.location.origin);
              navigator.clipboard.writeText(url.toString());
              toast.success('Image Link Copied');
            }
          }}
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-black/80 border border-white/10 active:bg-black/60  flex items-center justify-center text-white transition-all active:scale-90 shadow-2xl"
          title="Share Link"
        >
          <Icon name="share-2" className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <button
          onClick={onClose}
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-black/80 border border-white/10 active:bg-black/60  flex items-center justify-center text-white transition-all active:scale-90 shadow-2xl ml-2"
        >
          <span className="text-xl">✕</span>
        </button>
      </div>
    </div>
  );
}
