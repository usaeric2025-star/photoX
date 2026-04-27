import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Share2, Edit3, Minimize2, Settings2, ChevronRight, X, Plus, Pencil } from 'lucide-react';
import { Photo, Category, Tag, DB_Category } from '../../types';
import { savePhotoToCloud } from '../../services/supabaseService';
import { useGalleryContext } from '../../context/GalleryContext';
import { useAdminPhoto, useAdminUI, useAdminSession } from '../../context/AdminContexts';
import { PhotoCard } from '../PhotoCard';

interface GroupDetailScreenProps {
  activeGroupId: string;
  setActiveGroupId: (id: string | null) => void;
  focusedGroupPhotoId: string | null;
  setFocusedGroupPhotoId: (id: string | null) => void;
  publicPhotos: Photo[];
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  setPreviewUri: (uri: string | null) => void;
  onEditPhoto: (photo: Photo) => void;
  onAddPhotoToGroup: () => void;
  onBatchEdit?: (ids: string[]) => void;
}

export const GroupDetailScreen: React.FC<GroupDetailScreenProps> = ({
  activeGroupId,
  setActiveGroupId,
  focusedGroupPhotoId,
  setFocusedGroupPhotoId,
  publicPhotos,
  photos,
  setPhotos,
  setPreviewUri,
  onEditPhoto,
  onAddPhotoToGroup,
  onBatchEdit
}) => {
  const { user } = useGalleryContext();
  const { viewMode, appLang: lang, isAdminMode } = useAdminSession();
  const { handleUngroup: handleUngroupAction, dbCategories, categories, tags, manufacturers } = useAdminPhoto();
  const { setAlertDialog: setAlert, setConfirmDialog: setConfirm, setBatchEditIds } = useAdminUI();
  
  const appLang = lang;
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const isMultiSelect = selectedPhotoIds.length > 0;

  const activePhotosSource = viewMode === 'public' ? publicPhotos : photos;
  const groupPhotos = activePhotosSource.filter(p => p.groupId === activeGroupId);
  
  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const updateGroupPhotos = (updater: (prev: Photo[]) => Photo[]) => {
    setPhotos(prev => {
      const next = updater(prev);
      if (user) {
        next.filter(p => p.groupId === activeGroupId).forEach(p => {
          const oldP = prev.find(old => old.id === p.id);
          if (oldP && JSON.stringify(oldP) !== JSON.stringify(p)) {
            savePhotoToCloud(user.id, p).catch(e => console.error("Auto backup failed:", e));
          }
        });
      }
      return next;
    });
  };

  if (groupPhotos.length === 0) return null;

  const focusedPhoto = focusedGroupPhotoId ? groupPhotos.find(p => p.id === focusedGroupPhotoId) : null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-50 flex flex-col">
      <div className="px-6 py-4 border-b border-white/50 flex items-center justify-between bg-white/40 pt-safe">
        <button onClick={() => { setActiveGroupId(null); setFocusedGroupPhotoId(null); }} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 ml-1 text-center">
           <h2 className="font-bold text-lg text-slate-800 leading-tight">同組照片</h2>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Group {activeGroupId}</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => onBatchEdit?.(groupPhotos.map(p => p.id))}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="統一編輯"
            >
              <Pencil size={20} />
            </button>
          <button 
            onClick={async () => {
              const files = await Promise.all(groupPhotos.map(async (p, i) => {
                const res = await fetch(p.uri);
                const blob = await res.blob();
                return new File([blob], `group_${activeGroupId}_${i+1}.jpg`, { type: 'image/jpeg' });
              }));

              if (navigator.share) {
                try {
                  await navigator.share({
                    files: files,
                    title: `照片組 ${activeGroupId}`,
                  });
                } catch (err) {
                  setAlert({ title: '提示', message: '部分瀏覽器不支援多檔分享。' });
                }
              }
            }}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
            title="分享全組"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
         <div className="p-6 space-y-6 pb-20">
            <AnimatePresence>
              {focusedPhoto && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="aspect-square bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative group border border-white/20 mb-8"
                >
                  <img 
                    src={focusedPhoto.uri} 
                    className="w-full h-full object-contain" 
                    onClick={() => setPreviewUri(focusedPhoto.uri)}
                    alt="Focused Photo" 
                  />
                  
                  <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                     <div className="bg-black/30 backdrop-blur-lg border border-white/20 p-3 rounded-2xl inline-block max-w-[85%] shadow-xl">
                        <p className="text-white text-[10px] font-medium leading-relaxed line-clamp-2 opacity-90">
                          {focusedPhoto.description || "點擊圖片查看大圖"}
                        </p>
                        {focusedPhoto.dimensions && Array.isArray(focusedPhoto.dimensions) && focusedPhoto.dimensions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 px-1">
                             {focusedPhoto.dimensions.map((dim: any, idx: number) => (
                                <span key={idx} className="text-[9px] font-black text-blue-300 uppercase tracking-widest bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-400/20">
                                  {dim.label ? `${dim.label}: ` : ''}{dim.length}x{dim.width}x{dim.height} {dim.unit || 'cm'}
                                </span>
                             ))}
                          </div>
                        )}
                     </div>
                  </div>

                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <button 
                        onClick={() => onEditPhoto(focusedPhoto)}
                        className="bg-blue-600 backdrop-blur-md p-3 rounded-2xl text-white shadow-xl border border-white/20 flex items-center gap-2"
                        title="編輯此相片"
                      >
                        <Edit3 size={18} />
                        <span className="text-xs font-bold">编辑详情</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          updateGroupPhotos(prev => prev.map(p => {
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
                    className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/80 hover:bg-black/60 transition-colors"
                  >
                    <Minimize2 size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-sm overflow-hidden">
              <button 
                onClick={() => {
                  if (selectedPhotoIds.length > 0) {
                    onBatchEdit?.(selectedPhotoIds);
                  } else {
                    setAlert({ title: '提示', message: '請先選擇照片' });
                  }
                }}
                className="w-full px-6 py-4 flex items-center justify-between active:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${isMultiSelect ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Settings2 size={16} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800">🛠️ 統一修改選中照片 ({selectedPhotoIds.length})</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Batch Tagging & Category</p>
                  </div>
                </div>
              </button>

              <AnimatePresence>
              </AnimatePresence>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                  組內容 ({groupPhotos.length})
                </h3>
                  <button 
                    onClick={() => {
                      setConfirm({
                        message: `確定要將這 ${groupPhotos.length} 張照片解除同組嗎？`,
                        onConfirm: () => {
                          handleUngroupAction(activeGroupId);
                          setActiveGroupId(null);
                          setFocusedGroupPhotoId(null);
                        }
                      });
                    }}
                    className="text-[10px] text-red-500 font-bold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <X size={12} /> 解除群組
                  </button>
              </div>
              
               
               <div className="grid grid-cols-3 gap-3">
                 {groupPhotos.map((photo, idx) => (
                   <PhotoCard 
                     key={photo.id}
                     photo={photo}
                     index={idx}
                     isAdminMode={isAdminMode}
                     isMultiSelect={isMultiSelect}
                     isStaffMode={false} // Adjust based on requirement
                     isSelected={selectedPhotoIds.includes(photo.id)}
                     showGroupsCollapsed={false}
                     lang={lang}
                     t={{}} // Passed empty object, update if necessary
                     dbCategories={dbCategories}
                     categories={categories}
                     tagMap={{}} // Passed empty object
                     onToggleSelection={() => togglePhotoSelection(photo.id)}
                     onLightboxOpen={() => setFocusedGroupPhotoId(photo.id)}
                   />
                 ))}
                 <button 
                   onClick={onAddPhotoToGroup}
                   className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors bg-white/40"
                 >
                   <Plus size={20} />
                   <span className="text-[8px] font-bold mt-1 uppercase">新增</span>
                 </button>
               </div>
            </div>
         </div>
      </div>

      <div className="absolute bottom-10 right-8 z-[120]">
         <motion.button
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.9 }}
           onClick={() => { setActiveGroupId(null); setFocusedGroupPhotoId(null); }}
           className="w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20 active:bg-slate-900 transition-all group"
         >
           <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
         </motion.button>
      </div>
    </div>
  );
};
