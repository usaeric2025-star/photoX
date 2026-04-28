import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize, Edit3, Settings2, Minimize2, Plus, Pencil, Layers, Share2, ChevronLeft } from 'lucide-react';
import { Photo } from '../types';
import { PhotoCard } from './PhotoCard';

interface GroupDetailViewProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  photos: Photo[];
  displayPhotos: Photo[];
  setLightboxIndex: (index: number) => void;
  isAdminMode: boolean;
  onEditPhoto?: (photo: Photo) => void; // Reused type
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  
  // Admin-specific props
  onBatchEdit?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onAddPhotoToGroup?: () => void;
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>;
  updateGroupPhotos?: (updater: (prev: Photo[]) => Photo[]) => void;
  lang?: string;
  t?: any;
  categories?: any[];
  tagMap?: Record<string, string>;
  isMultiSelect?: boolean;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  activeGroupId, setActiveGroupId, photos, displayPhotos, setLightboxIndex,
  isAdminMode, onEditPhoto, onLongPressStart, onLongPressEnd,
  onBatchEdit, onUngroup, onAddPhotoToGroup,
  setPhotos, updateGroupPhotos,
  lang, t, categories, tagMap, isMultiSelect
}) => {
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  
  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos.filter(p => p.groupId === activeGroupId);
  }, [activeGroupId, photos]);

  const focusedPhoto = useMemo(() => 
    focusedGroupPhotoId ? activeGroupPhotos.find(p => p.id === focusedGroupPhotoId) : null
  , [focusedGroupPhotoId, activeGroupPhotos]);

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
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
           <div className="flex flex-col mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-black text-[#1D3557] tracking-tighter">
                    GROUP {activeGroupId?.slice(-4)}
                </h2>
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="p-3 bg-white border border-[#1D3557]/10 rounded-full text-[#1D3557] shadow-sm hover:ring-2 hover:ring-[#D4A853] transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 font-medium tracking-wide">
                {activeGroupPhotos.length} photos
              </p>
           </div>
           
           {/* Admin Detail View for Photo (If focused) */}
           <AnimatePresence>
             {isAdminMode && focusedPhoto && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="aspect-square bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative group border border-white/20 mb-8"
                >
                  <img 
                    src={focusedPhoto.uri || focusedPhoto.image_url} 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                    alt="Focused Photo" 
                  />
                  
                  <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                     <div className="bg-black/30 backdrop-blur-lg border border-white/20 p-3 rounded-2xl inline-block max-w-[85%] shadow-xl">
                        <p className="text-white text-[10px] font-medium leading-relaxed line-clamp-2 opacity-90">
                          {focusedPhoto.description || "點擊圖片查看大圖"}
                        </p>
                     </div>
                  </div>

                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <button 
                      onClick={() => onEditPhoto?.(focusedPhoto)}
                      className="bg-blue-600 backdrop-blur-md p-3 rounded-2xl text-white shadow-xl border border-white/20 flex items-center gap-2"
                      title="編輯此相片"
                    >
                      <Edit3 size={18} />
                      <span className="text-xs font-bold">编辑详情</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        updateGroupPhotos?.(prev => prev.map(p => {
                          if (p.groupId === activeGroupId) {
                            if (p.id === focusedPhoto.id) return { ...p, isGroupCover: true };
                            if (p.isGroupCover) return { ...p, isGroupCover: false };
                          }
                          return p;
                        }));
                      }}
                      className={`backdrop-blur-md p-3 rounded-2xl border flex items-center gap-2 shadow-xl transition-all ${focusedPhoto.isGroupCover ? 'bg-yellow-400 text-white border-yellow-300' : 'bg-black/40 text-white border-white/10'}`}
                      title="設為封面"
                    >
                      <Settings2 size={18} />
                      <span className="text-xs font-bold">{focusedPhoto.isGroupCover ? '核心封面' : '设为封面'}</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setFocusedGroupPhotoId(null)}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-full text-slate-800 shadow-xl hover:bg-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </motion.div>
             )}
           </AnimatePresence>

           {/* Admin tools */}
           {isAdminMode && (
             <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-sm overflow-hidden mb-8">
               <button 
                 onClick={() => {
                   if (selectedPhotoIds.length > 0) {
                     onBatchEdit?.(selectedPhotoIds);
                   } else {
                     alert('請先選擇照片'); // Simplification for now
                   }
                 }}
                 className="w-full px-6 py-4 flex items-center justify-between active:bg-white/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl transition-colors ${selectedPhotoIds.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                     <Settings2 size={16} />
                   </div>
                   <div className="text-left">
                     <h3 className="text-xs font-bold text-slate-800">🛠️ 統一修改選中照片 ({selectedPhotoIds.length})</h3>
                   </div>
                 </div>
               </button>
             </div>
           )}

           <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                組內容 ({activeGroupPhotos.length})
              </h3>
              {isAdminMode && (
                <button 
                  onClick={async () => {
                    if (confirm(`確定要將這 ${activeGroupPhotos.length} 張照片解除同組嗎？`)) {
                      try {
                        await onUngroup?.(activeGroupId);
                        setActiveGroupId(null);
                      } catch (err) {
                        console.error('Failed to ungroup:', err);
                      }
                    }
                  }}
                  className="text-[10px] text-red-500 font-bold flex items-center gap-1 active:scale-95 transition-all"
                >
                  <X size={12} /> 解除群組
                </button>
              )}
            </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
              {activeGroupPhotos.map((photo) => (
                <motion.div 
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`aspect-square bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl border cursor-pointer relative group transition-all ${selectedPhotoIds.includes(photo.id) ? 'ring-4 ring-blue-500' : 'border-[#1D3557]/10'}`}
                  onClick={() => {
                      if (isAdminMode) {
                        togglePhotoSelection(photo.id);
                      } else {
                        const realIndex = displayPhotos.findIndex(p => p.id === photo.id);
                        if (realIndex !== -1) setLightboxIndex(realIndex);
                      }
                  }}
                  onMouseDown={() => { if (isAdminMode) onLongPressStart(photo.id); }}
                  onMouseUp={onLongPressEnd}
                  onMouseLeave={onLongPressEnd}
                  onTouchStart={() => { if (isAdminMode) onLongPressStart(photo.id); }}
                  onTouchEnd={onLongPressEnd}
                >
                   <img 
                    src={photo.thumb_url || photo.image_url || photo.uri || undefined} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                   />
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      {!isAdminMode && <Maximize className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={32} />}
                   </div>
                   
                   <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {photo.groupId?.slice(-4)}
                   </div>

                   {isAdminMode && (
                     <div className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white">
                        {selectedPhotoIds.includes(photo.id) ? <X size={16} /> : <div className="w-4 h-4 border-2 rounded-full border-white" />}
                     </div>
                   )}
                </motion.div>
              ))}
              
              {isAdminMode && (
                <button 
                  onClick={onAddPhotoToGroup}
                  className="aspect-square rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors bg-white/40"
                >
                  <Plus size={20} />
                  <span className="text-[8px] font-bold mt-1 uppercase">新增</span>
                </button>
              )}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
