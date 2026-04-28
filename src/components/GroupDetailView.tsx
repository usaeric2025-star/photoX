import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, Settings2, Plus, ChevronLeft, Layers, Pencil } from 'lucide-react';
import { Photo } from '../types';
import { updatePhotosGroupInCloud } from '../services/supabaseService';

interface GroupDetailViewProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  photos: Photo[];
  isAdminMode: boolean;
  onEditPhoto?: (photo: Photo) => void;
  // Admin-specific props-changed
  onBatchEdit?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onAddPhotoToGroup?: () => void;
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>;
  updateGroupPhotos?: (ids: string[], groupId: string | null) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  activeGroupId, setActiveGroupId, photos,
  isAdminMode, onEditPhoto,
  onBatchEdit, onUngroup, onAddPhotoToGroup,
  setPhotos, updateGroupPhotos,
}) => {
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const longPressTimer = useRef<any>(null);

  const groupIdRef = useRef(activeGroupId);
  useEffect(() => {
    if (activeGroupId) groupIdRef.current = activeGroupId;
  }, [activeGroupId]);
  
  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos.filter(p => p.groupId === activeGroupId);
  }, [activeGroupId, photos]);

  const focusedPhoto = useMemo(() => 
    focusedGroupPhotoId ? activeGroupPhotos.find(p => p.id === focusedGroupPhotoId) : null
  , [focusedGroupPhotoId, activeGroupPhotos]);

  const handleRemoveFromGroup = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    if (confirm('確定要將這張照片移出群組嗎？')) {
      setPhotos?.(prev => prev.map(p => 
        p.id === photo.id ? { ...p, groupId: null } : p
      ));
      await updatePhotosGroupInCloud([photo.id], null);
    }
  };

  const handlePhotoClick = (photo: Photo) => {
      if (isMultiSelectMode) {
        const next = selectedPhotoIds.includes(photo.id)
          ? selectedPhotoIds.filter(id => id !== photo.id)
          : [...selectedPhotoIds, photo.id];
        setSelectedPhotoIds(next);
        if (next.length === 0) setIsMultiSelectMode(false);
      } else {
        setFocusedGroupPhotoId(photo.id);
      }
  };

  return (
    <AnimatePresence>
      {activeGroupId !== null && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#FDFAF6] p-6 overflow-y-auto pt-safe"
        >
           {/* Header */}
           <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#FDFAF6]/80 backdrop-blur-sm z-50 py-4">
              <button 
                onClick={() => setActiveGroupId(null)}
                className="p-3 bg-white border border-[#1D3557]/10 rounded-full text-[#1D3557] shadow-sm hover:ring-2 hover:ring-[#D4A853] transition-all"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-black text-[#1D3557] tracking-tighter">
                  GROUP {activeGroupId?.slice(-4)}
              </h2>

              {isAdminMode && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const ids = selectedPhotoIds.length > 0 ? selectedPhotoIds : activeGroupPhotos.map(p => p.id);
                      onBatchEdit?.(ids);
                    }}
                    className={`p-3 border rounded-full shadow-sm bg-white border-[#D4A853] text-[#D4A853]`}
                  >
                    <Pencil size={20} />
                  </button>
                  <button onClick={async () => {
                      if (confirm(`確定要解散這 ${activeGroupPhotos.length} 張照片的群組嗎？`)) {
                        await onUngroup?.(groupIdRef.current!);
                        setActiveGroupId(null);
                      }
                  }} className="p-3 bg-white border border-[#1D3557]/10 rounded-full text-[#1D3557] shadow-sm"><Layers size={20} /></button>
                  <button onClick={onAddPhotoToGroup} className="p-3 bg-white border border-[#1D3557]/10 rounded-full text-[#1D3557] shadow-sm"><Plus size={20} /></button>
                </div>
              )}
           </div>
           
           {/* Detail View */}
           <AnimatePresence>
             {focusedPhoto && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-0 z-[210] bg-black flex items-center justify-center p-4"
                >
                  <img 
                    src={focusedPhoto.uri || focusedPhoto.image_url} 
                    className="max-w-full max-h-full object-contain" 
                    referrerPolicy="no-referrer"
                    alt="Focused Photo" 
                  />

                  {isAdminMode && (
                    <div className="absolute bottom-6 left-0 right-0 
                      flex justify-center gap-3 px-4 z-[220]">
                      <button
                        onClick={() => {
                          setFocusedGroupPhotoId(null);
                          onEditPhoto?.(focusedPhoto);
                        }}
                        className="bg-white text-[#1D3557] p-4 
                        rounded-full shadow-xl active:scale-95 
                        transition-all"
                      >
                        <Edit3 size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setPhotos?.(prev => prev.map(p => {
                            if (p.groupId !== activeGroupId) return p;
                            return { ...p, isGroupCover: p.id === focusedPhoto.id };
                          }));
                        }}
                        className={`p-3 rounded-full shadow-xl
                          ${focusedPhoto.isGroupCover 
                            ? 'bg-[#D4A853] text-white' 
                            : 'bg-white text-[#1D3557]'}`}
                      >
                        <Settings2 size={20} />
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setFocusedGroupPhotoId(null)}
                    className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white"
                  >
                    <X size={24} />
                  </button>
                </motion.div>
             )}
           </AnimatePresence>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
              {isAdminMode && isMultiSelectMode && (
                <div className="text-center text-xs font-bold 
                  text-[#1D3557]/60 mb-4 col-span-full">
                  已选 {selectedPhotoIds.length} 张
                </div>
              )}
              {activeGroupPhotos.map((photo) => (
                <motion.div 
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`aspect-square bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl border cursor-pointer relative group transition-all ${selectedPhotoIds.includes(photo.id) ? 'ring-4 ring-blue-500' : 'border-[#1D3557]/10'}`}
                  onClick={() => handlePhotoClick(photo)}
                  onTouchStart={() => {
                    longPressTimer.current = setTimeout(() => {
                      setIsMultiSelectMode(true);
                      setSelectedPhotoIds([photo.id]);
                      if ('vibrate' in navigator) navigator.vibrate(50);
                    }, 800);
                  }}
                  onTouchEnd={() => clearTimeout(longPressTimer.current)}
                  onTouchMove={() => clearTimeout(longPressTimer.current)}
                >
                   <img 
                    src={photo.thumb_url || photo.image_url || photo.uri || undefined} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                   />
                 
                   {isAdminMode && isMultiSelectMode && (
                     <div className={`absolute inset-0 flex items-center 
                       justify-center transition-all
                       ${selectedPhotoIds.includes(photo.id) 
                         ? 'bg-blue-500/30' 
                         : 'bg-black/10'}`}
                     >
                       <div className={`w-6 h-6 rounded-full border-2 
                         flex items-center justify-center
                         ${selectedPhotoIds.includes(photo.id)
                           ? 'bg-blue-500 border-blue-500'
                           : 'border-white bg-black/30'}`}
                       >
                         {selectedPhotoIds.includes(photo.id) && (
                           <X size={12} className="text-white" />
                         )}
                       </div>
                     </div>
                   )}

                   {isAdminMode && !isMultiSelectMode && (
                     <button onClick={(e) => handleRemoveFromGroup(e, photo)}
                       className="absolute top-2 right-2 p-1 
                       bg-black/50 text-white rounded-full 
                       hover:bg-red-500 transition-colors z-10"
                     >
                       <X size={14} />
                     </button>
                   )}
                </motion.div>
              ))}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
