import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, Settings2, Plus, ChevronLeft, Layers, Pencil, Sparkles, Star } from 'lucide-react';
import { Photo } from '../types';
import { updatePhotosGroupInCloud, updatePhotoInCloud } from '../services/supabaseService';

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
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  activeGroupId, setActiveGroupId, photos,
  isAdminMode, onEditPhoto,
  onBatchEdit, onUngroup, onAddPhotoToGroup,
  setPhotos, updateGroupPhotos, onAiAnalyze, onCancelAnalyze, isAnalyzing, onBatchAiAnalyze,
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
    return photos
      .filter(p => p.groupId === activeGroupId)
      .sort((a, b) => {
        if (a.isGroupCover) return -1;
        if (b.isGroupCover) return 1;
        return 0;
      });
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

  const handleSetCover = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    setPhotos?.(prev => prev.map(p => {
      if (p.groupId !== activeGroupId) return p;
      return { ...p, isGroupCover: p.id === photoId };
    }));
    
    // Save to cloud - we need to update all in this group potentially or at least the new cover
    await Promise.all(
        activeGroupPhotos.map(p => 
           updatePhotoInCloud(p.id, { isGroupCover: p.id === photoId })
        )
    );
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
          className="fixed inset-0 z-[200] bg-[#FDFAF6] overflow-y-auto pt-safe"
        >
           {/* Header */}
           <div className="grid grid-cols-[auto,1fr,auto] gap-4 mb-2 sticky top-0 bg-[#FDFAF6]/90 backdrop-blur-md z-50 px-6 py-4 items-center border-b border-slate-100">
              <div className="flex items-center">
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="p-2 -ml-2 text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
              
              <div className="flex flex-col">
                <h2 className="text-base font-black text-slate-800 tracking-tight">
                    {activeGroupPhotos[0]?.name || `GROUP ${activeGroupId?.slice(-4)}`}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeGroupPhotos.length} 張照片 / Photos</p>
              </div>

              <div className="flex items-center gap-2">
                 {isAdminMode && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const ids = selectedPhotoIds.length > 0 ? selectedPhotoIds : activeGroupPhotos.map(p => p.id);
                          onBatchEdit?.(ids);
                        }}
                        className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all"
                        title="批量編輯"
                      >
                        <Pencil size={18} />
                      </button>
                      <button onClick={async () => {
                          if (confirm(`確定要解散這 ${activeGroupPhotos.length} 張照片的群組嗎？`)) {
                            await onUngroup?.(groupIdRef.current!);
                            setActiveGroupId(null);
                          }
                      }} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all" title="解散群組"><Layers size={18} /></button>
                      <button onClick={() => onBatchAiAnalyze?.(activeGroupPhotos)} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all text-purple-600" title="AI 自動分析"><Sparkles size={18} /></button>
                      <button onClick={onAddPhotoToGroup} className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"><Plus size={18} /></button>
                    </div>
                 )}
              </div>
           </div>
           
           {/* Detail View (Lightbox) */}
           <AnimatePresence>
             {focusedPhoto && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[210] bg-black flex items-center justify-center"
                >
                  <img 
                    src={focusedPhoto.uri || focusedPhoto.image_url} 
                    className="max-w-full max-h-full object-contain" 
                    referrerPolicy="no-referrer"
                    alt="Focused Photo" 
                  />

                  {/* Removed individual action buttons for grouped photos */}

                  <button 
                    onClick={() => setFocusedGroupPhotoId(null)}
                    className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </motion.div>
             )}
           </AnimatePresence>

           <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-32">
              {isAdminMode && isMultiSelectMode && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl col-span-full mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-700">已選 {selectedPhotoIds.length} 張照片</span>
                  <button onClick={() => setIsMultiSelectMode(false)} className="text-xs font-black text-blue-600 uppercase tracking-widest">取消選擇</button>
                </div>
              )}
              {activeGroupPhotos.map((photo) => (
                <motion.div 
                  key={photo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  className={`aspect-square bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border cursor-pointer relative group transition-all ${selectedPhotoIds.includes(photo.id) ? 'ring-4 ring-blue-500 border-blue-500' : 'border-slate-100'}`}
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
                     className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                     referrerPolicy="no-referrer"
                   />
                  
                   {/* Cover Badge */}
                   {photo.isGroupCover && (
                     <div className="absolute top-3 left-3 bg-[#D4A853] text-white p-1.5 rounded-lg shadow-lg z-20">
                       <Star size={12} fill="currentColor" />
                     </div>
                   )}

                   {isAdminMode && !isMultiSelectMode && (
                     <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleSetCover(e, photo.id)}
                          className={`p-2 rounded-full backdrop-blur-md transition-colors ${photo.isGroupCover ? 'bg-[#D4A853] text-white' : 'bg-black/40 text-white hover:bg-[#D4A853]'}`}
                          title="設為封面"
                        >
                          <Star size={14} fill={photo.isGroupCover ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={(e) => handleRemoveFromGroup(e, photo)}
                          className="p-2 bg-black/40 text-white rounded-full hover:bg-red-500 backdrop-blur-md transition-colors"
                        >
                          <X size={14} />
                        </button>
                     </div>
                   )}

                   {isAdminMode && isMultiSelectMode && (
                     <div className={`absolute inset-0 flex items-center 
                       justify-center transition-all
                       ${selectedPhotoIds.includes(photo.id) 
                         ? 'bg-blue-500/20' 
                         : 'bg-black/10'}`}
                     >
                       <div className={`w-8 h-8 rounded-full border-2 
                         flex items-center justify-center transition-all
                         ${selectedPhotoIds.includes(photo.id)
                           ? 'bg-blue-500 border-blue-500 shadow-lg'
                           : 'border-white bg-black/20'}`}
                       >
                         {selectedPhotoIds.includes(photo.id) && (
                           <X size={16} className="text-white" />
                         )}
                       </div>
                     </div>
                   )}
                </motion.div>
              ))}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
