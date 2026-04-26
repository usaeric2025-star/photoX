import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize } from 'lucide-react';
import { Photo } from '../types';

interface GroupDetailViewProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  photos: Photo[];
  displayPhotos: Photo[];
  setLightboxIndex: (index: number) => void;
  isAdminMode: boolean;
  onEditPhoto?: (id: string) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  activeGroupId, setActiveGroupId, photos, displayPhotos, setLightboxIndex,
  isAdminMode, onEditPhoto, onLongPressStart, onLongPressEnd
}) => {
  const activeGroupPhotos = React.useMemo(() => {
    if (!activeGroupId) return [];
    return photos.filter(p => p.groupId === activeGroupId);
  }, [activeGroupId, photos]);

  return (
    <AnimatePresence>
      {activeGroupId !== null && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#FDFAF6] p-6 overflow-y-auto"
        >
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1D3557] tracking-tighter">Group {activeGroupId}</h2>
              <button 
                onClick={() => setActiveGroupId(null)}
                className="p-3 bg-white border border-[#1D3557]/10 rounded-full text-[#1D3557] shadow-sm hover:ring-2 hover:ring-[#D4A853] transition-all"
              >
                <X size={20} />
              </button>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activeGroupPhotos.map((photo) => (
                <motion.div 
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-[#1D3557]/5 cursor-pointer relative group active:ring-2 active:ring-blue-500 transition-all"
                  onClick={() => {
                      const realIndex = displayPhotos.findIndex(p => p.id === photo.id);
                      if (realIndex !== -1) {
                        setLightboxIndex(realIndex);
                      }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (isAdminMode) return;
                  }}
                  onMouseDown={() => { if (isAdminMode) onLongPressStart(photo.id); }}
                  onMouseUp={onLongPressEnd}
                  onMouseLeave={onLongPressEnd}
                  onTouchStart={() => { if (isAdminMode) onLongPressStart(photo.id); }}
                  onTouchEnd={onLongPressEnd}
                >
                   <img src={photo.thumb_url || photo.image_url || photo.uri || undefined} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Maximize className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                   </div>
                </motion.div>
              ))}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
