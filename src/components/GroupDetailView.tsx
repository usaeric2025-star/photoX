import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Edit3, Settings2, Plus, ChevronLeft, Layers, Pencil, Sparkles, 
  Star, ArrowLeft, ArrowRight, MoreVertical, Trash2, Check, 
  Maximize, MessageSquare, Type, Save, Trash, AlertCircle
} from 'lucide-react';
import { Photo, Tag, Category } from '../types';
import { updatePhotosGroupInCloud, updatePhotoInCloud, savePhotoToCloud } from '../services/photoService';

interface GroupDetailViewProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  photos: Photo[];
  isAdminMode: boolean;
  onEditPhoto?: (photo: Photo) => void;
  onBatchEdit?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onAddPhotoToGroup?: () => void;
  setPhotos?: React.Dispatch<React.SetStateAction<Photo[]>>;
  updateGroupPhotos?: (ids: string[], groupId: string | null) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  lang?: string;
  t?: any;
  categories?: any[];
  tagMap?: Record<string, string>;
  allTags?: Tag[];
  isMultiSelect?: boolean;
  setConfirmDialog?: (d: any) => void;
  setAlertDialog?: (d: any) => void;
  setLoadingState?: (s: string) => void;
}

const DIMENSION_PRESETS = ['120x60', '140x80', '160x90'];

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  activeGroupId, setActiveGroupId, photos,
  isAdminMode, onEditPhoto,
  onBatchEdit, onUngroup, onAddPhotoToGroup,
  setPhotos, updateGroupPhotos, onAiAnalyze, onCancelAnalyze, isAnalyzing, onBatchAiAnalyze,
  t, categories, tagMap, allTags = [],
  setConfirmDialog: propsSetConfirmDialog,
  setAlertDialog: propsSetAlertDialog,
  setLoadingState: propsSetLoadingState
}) => {
  const setConfirmDialog = propsSetConfirmDialog || (() => {});
  const setAlertDialog = propsSetAlertDialog || ((d: any) => alert(d.message || d.title));
  const setLoadingState = propsSetLoadingState || (() => {});
  
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inline Editing States
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [modalType, setModalType] = useState<'tags' | 'dims' | 'note' | null>(null);
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [customDim, setCustomDim] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const groupIdRef = useRef(activeGroupId);
  useEffect(() => {
    if (activeGroupId) groupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };
  
  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos
      .filter(p => p.groupId === activeGroupId)
      .sort((a, b) => {
        if (a.isGroupCover) return -1;
        if (b.isGroupCover) return 1;
        if (a.groupOrder !== undefined && b.groupOrder !== undefined) {
          return a.groupOrder - b.groupOrder;
        }
        return (a.item_code || '').localeCompare(b.item_code || '');
      });
  }, [activeGroupId, photos]);

  const persistPhotoChange = async (photoId: string, updates: Partial<Photo>) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    const updatedPhoto = { ...photo, ...updates, updatedAt: new Date().toISOString() };
    
    // 1. Update UI
    setPhotos?.(prev => prev.map(p => p.id === photoId ? updatedPhoto : p));
    
    // 2. Clear modal
    setModalType(null);
    setModalTargetId(null);

    // 3. Sync to cloud
    try {
      if (updates.tagIds) {
        // use local instance if available or 'default'
        await savePhotoToCloud((photo as any).userId || 'default', updatedPhoto);
      } else {
        await updatePhotoInCloud(photoId, updates);
      }
      showToast('已保存 / Saved');
    } catch (err: any) {
      setAlertDialog({ title: '保存失敗', message: err.message });
    }
  };

  const handleUpdateGroupName = async () => {
    if (!editingGroupName.trim() || !activeGroupId) {
      setEditingGroupId(null);
      return;
    }

    const nextPhotos = photos.map(p => {
      if (p.groupId === activeGroupId) return { ...p, name: editingGroupName };
      return p;
    });

    setPhotos?.(nextPhotos);
    setEditingGroupId(null);
    showToast('名稱已更新 / Name updated');

    // Sync to cloud for all photos in group
    try {
      const groupPhotos = activeGroupPhotos;
      await Promise.all(
        groupPhotos.map(p => updatePhotoInCloud(p.id, { name: editingGroupName }))
      );
    } catch (err: any) {
      setAlertDialog({ title: '名稱同步失敗', message: err.message });
    }
  };

  const currentModalPhoto = useMemo(() => 
    modalTargetId ? activeGroupPhotos.find(p => p.id === modalTargetId) : null
  , [modalTargetId, activeGroupPhotos]);

  const handleToggleTag = (photo: Photo, tagId: string) => {
    const currentTags = Array.isArray(photo.tagIds) ? photo.tagIds : [];
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    persistPhotoChange(photo.id, { tagIds: nextTags });
  };

  const handleSetDim = (photo: Photo, label: string) => {
    persistPhotoChange(photo.id, { 
      dimensions: [{ label, unit: 'cm', isAI: false }] 
    });
  };

  const handleSaveNote = () => {
    if (modalTargetId) {
      persistPhotoChange(modalTargetId, { note: noteInput });
    }
  };

  const handleReorder = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    
    const dragIdx = activeGroupPhotos.findIndex(p => p.id === draggedId);
    const hoverIdx = activeGroupPhotos.findIndex(p => p.id === targetId);
    
    if (dragIdx === -1 || hoverIdx === -1) return;
    
    const nextGroupPhotos = [...activeGroupPhotos];
    const [draggedPhoto] = nextGroupPhotos.splice(dragIdx, 1);
    nextGroupPhotos.splice(hoverIdx, 0, draggedPhoto);
    
    const updatedWithOrder = nextGroupPhotos.map((p, idx) => ({
      ...p,
      groupOrder: idx,
      isGroupCover: p.isGroupCover // maintain cover
    }));
    
    setPhotos?.(prev => prev.map(p => {
      const updated = updatedWithOrder.find(up => up.id === p.id);
      return updated ? updated : p;
    }));
    
    try {
      showToast('排序中...');
      await Promise.all(
        updatedWithOrder.map(p => updatePhotoInCloud(p.id, { group_order: p.groupOrder }))
      );
      showToast('排序已保存');
    } catch (err: any) {
      setAlertDialog({ title: '排序同步失敗', message: err.message });
    }
  };

  const handleBulkAction = async (action: 'ai' | 'remove' | 'batch') => {
    if (selectedPhotoIds.length === 0) return;
    
    if (action === 'ai') {
      const targetPhotos = activeGroupPhotos.filter(p => selectedPhotoIds.includes(p.id));
      onBatchAiAnalyze?.(targetPhotos);
      setIsMultiSelectMode(false);
      setSelectedPhotoIds([]);
    } else if (action === 'remove') {
      setConfirmDialog({
        message: `確定要將選中的 ${selectedPhotoIds.length} 張照片移出群組嗎？`,
        onConfirm: async () => {
          setPhotos?.(prev => prev.map(p => 
            selectedPhotoIds.includes(p.id) ? { ...p, groupId: null } : p
          ));
          try {
            await updatePhotosGroupInCloud(selectedPhotoIds, null);
            setIsMultiSelectMode(false);
            setSelectedPhotoIds([]);
            showToast('已移出 / Removed');
          } catch (err: any) {
            setAlertDialog({ title: '操作失敗', message: err.message });
          }
        }
      });
    } else if (action === 'batch') {
      onBatchEdit?.(selectedPhotoIds);
    }
  };

  return (
    <AnimatePresence>
      {activeGroupId !== null && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="fixed inset-0 z-[200] bg-[#FDFAF6] overflow-y-auto pt-safe flex flex-col"
        >
           {/* Top Header */}
           <div className="sticky top-0 bg-[#FDFAF6]/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                
                {editingGroupId === activeGroupId ? (
                   <input 
                     autoFocus
                     value={editingGroupName}
                     onChange={(e) => setEditingGroupName(e.target.value)}
                     onBlur={handleUpdateGroupName}
                     onKeyDown={(e) => e.key === 'Enter' && handleUpdateGroupName()}
                     className="text-lg font-black text-slate-800 bg-white border-2 border-blue-500 rounded-lg px-2 py-1 outline-none min-w-[200px]"
                   />
                ) : (
                   <div 
                     className="flex flex-col cursor-pointer group"
                     onClick={() => {
                        if (isAdminMode) {
                          setEditingGroupId(activeGroupId);
                          setEditingGroupName(activeGroupPhotos[0]?.name || '');
                        }
                     }}
                   >
                     <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">
                          {activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                        </h2>
                        {isAdminMode && <Pencil size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                     </div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeGroupPhotos.length} 張照片 / {activeGroupPhotos.length} Photos</p>
                   </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                 {isAdminMode && (
                   <div className="flex items-center gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => {
                          const ids = selectedPhotoIds.length > 0 ? selectedPhotoIds : activeGroupPhotos.map(p => p.id);
                          onBatchEdit?.(ids);
                        }}
                        className="hidden sm:flex w-10 h-10 items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all"
                        title="批量編輯"
                      >
                        <Pencil size={18} />
                      </button>
                      
                      <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all">
                          <MoreVertical size={18} />
                        </button>
                        {showMenu && <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[200]">
                           <button 
                             onClick={() => {
                               setConfirmDialog({
                                 message: `確定要解散這個群組嗎？照片將變為獨立展示。`,
                                 onConfirm: async () => {
                                   await onUngroup?.(groupIdRef.current!);
                                   setActiveGroupId(null);
                                 }
                               });
                               setShowMenu(false);
                             }}
                             className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                           >
                             <Layers size={16} /> 解散組 / Ungroup
                           </button>
                           {selectedPhotoIds.length > 0 && (
                             <button 
                               onClick={() => { handleBulkAction('remove'); setShowMenu(false); }}
                               className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                             >
                               <X size={16} /> 移出選中 / Remove Selected
                             </button>
                           )}
                        </div>}
                      </div>

                      <button onClick={onAddPhotoToGroup} className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                        <Plus size={18} />
                      </button>
                   </div>
                 )}
              </div>
           </div>

           {/* Main Grid Content */}
           <div className="flex-1 p-3 sm:p-6 pb-40">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
                {activeGroupPhotos.map((photo) => (
                  <motion.div 
                    key={photo.id}
                    layout
                    draggable={isAdminMode && !isMultiSelectMode}
                    onDragStart={() => setDraggedPhotoId(photo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedPhotoId) {
                        handleReorder(draggedPhotoId, photo.id);
                        setDraggedPhotoId(null);
                      }
                    }}
                    className={`bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md border p-2 flex flex-col group transition-all duration-300 relative min-h-[260px] ${photo.isGroupCover ? 'ring-4 ring-[#D4A853] border-transparent' : selectedPhotoIds.includes(photo.id) ? 'ring-4 ring-blue-500' : 'border-slate-100'}`}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        setSelectedPhotoIds(prev => 
                          prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
                        );
                      } else {
                        setFocusedGroupPhotoId(photo.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isAdminMode) {
                        setIsMultiSelectMode(true);
                        setSelectedPhotoIds([photo.id]);
                        if ('vibrate' in navigator) navigator.vibrate(50);
                      }
                    }}
                  >
                     {/* Image Container */}
                     <div className="aspect-square rounded-2xl overflow-hidden relative mb-3">
                        <img 
                          src={photo.thumb_url || photo.image_url || photo.uri} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Status Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                           {photo.isGroupCover && (
                             <div className="bg-[#D4A853] text-white p-1.5 rounded-lg shadow-lg">
                               <Star size={12} fill="currentColor" />
                             </div>
                           )}
                           {photo.isAnalyzing && (
                             <div className="bg-purple-600 text-white p-1.5 rounded-lg shadow-lg animate-pulse">
                               <Sparkles size={12} />
                             </div>
                           )}
                        </div>

                        {/* Quick Selection Toggle */}
                        {isMultiSelectMode && (
                          <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity`}>
                             <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedPhotoIds.includes(photo.id) ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white/10 border-white'}`}>
                                {selectedPhotoIds.includes(photo.id) && <Check size={16} className="text-white" />}
                             </div>
                          </div>
                        )}
                        
                        {/* Hover Overlay Menu for Admin */}
                        {isAdminMode && !isMultiSelectMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
                             <button 
                               onClick={(e) => { e.stopPropagation(); import('../services/photoService').then(m => m.updatePhotoInCloud(photo.id, { is_group_cover: !photo.isGroupCover })); setPhotos?.(prev => prev.map(p => p.id === photo.id ? {...p, isGroupCover: !p.isGroupCover} : (p.groupId === activeGroupId ? {...p, isGroupCover: false} : p))); showToast(photo.isGroupCover ? '已取消封面' : '已設為封面'); }}
                               className="w-10 h-10 rounded-full bg-white text-[#D4A853] flex items-center justify-center hover:scale-110 transform transition-all active:scale-95"
                             >
                                <Star size={20} fill={photo.isGroupCover ? "currentColor" : "none"} />
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); onEditPhoto?.(photo); }}
                               className="w-10 h-10 rounded-full bg-white text-slate-700 flex items-center justify-center hover:scale-110 transform transition-all active:scale-95"
                             >
                                <Pencil size={20} />
                             </button>
                          </div>
                        )}
                     </div>

                     {/* Info Section - Fast Editing */}
                     <div className="flex-1 space-y-2">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 line-clamp-2">
                           {(photo.tagIds || []).map(tid => (
                             <span key={tid} className="text-[10px] sm:text-xs font-bold bg-[#1D3557]/5 text-[#1D3557] rounded-md px-1.5 py-0.5 border border-[#1D3557]/10">
                                {tagMap?.[tid] || tid}
                             </span>
                           ))}
                           {isAdminMode && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); setModalType('tags'); setModalTargetId(photo.id); }}
                               className="text-[10px] font-bold bg-blue-50 text-blue-600 rounded-md px-1.5 py-0.5 border border-blue-100"
                             >
                               ➕
                             </button>
                           )}
                        </div>

                        {/* Fields */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50">
                             {isAdminMode ? (
                                <button className="text-[10px] font-black text-slate-500 hover:text-blue-600 tracking-tight" onClick={(e) => { e.stopPropagation(); /* TODO: model edit modal */ }}>
                                  {photo.model_number || '➕'}
                                </button>
                             ) : (
                                photo.model_number && <span className="text-[10px] font-black text-slate-700 tracking-tight">{photo.model_number}</span>
                             )}

                             {isAdminMode ? (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setModalType('dims'); setModalTargetId(photo.id); }}
                                 className="text-[10px] font-black text-slate-500 hover:text-blue-600 tracking-tight"
                               >
                                  {photo.dimensions?.[0] ? `📐 ${(() => {
                                      let s = photo.dimensions[0].label || '';
                                      if (!/(cm|mm|inch)/i.test(s)) s += ' ' + (photo.dimensions[0].unit || 'cm');
                                      return s;
                                    })()}` : '➕'}
                               </button>
                             ) : (
                               photo.dimensions?.[0] && (
                                 <span className="text-[10px] font-black text-slate-700 tracking-tight flex items-center gap-0.5">📐{(() => {
                                      let s = photo.dimensions[0].label || '';
                                      if (!/(cm|mm|inch)/i.test(s)) s += ' ' + (photo.dimensions[0].unit || 'cm');
                                      return s;
                                    })()}</span>
                               )
                             )}

                             {isAdminMode ? (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setModalType('note'); setModalTargetId(photo.id); setNoteInput(photo.note || ''); }}
                                 className={`text-[10px] font-black tracking-tight ${photo.note ? 'text-amber-600' : 'text-slate-300'}`}
                               >
                                  📝{photo.note ? photo.note.slice(0,6) : ''}
                               </button>
                             ) : (
                               photo.note && (
                                 <span className="text-[10px] font-bold text-slate-600 flex items-center gap-0.5">📝{photo.note}</span>
                               )
                             )}
                        </div>
                     </div>
                  </motion.div>
                ))}
              </div>
           </div>

           {/* Multi-Select Floating Bar */}
           <AnimatePresence>
             {isMultiSelectMode && selectedPhotoIds.length > 0 && (
               <motion.div 
                 initial={{ y: 100, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: 100, opacity: 0 }}
                 className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-[#1D3557] px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-[320px]"
               >
                  <div className="bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                    <Check size={14} className="text-white" />
                    <span className="text-sm font-black text-white">{selectedPhotoIds.length}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-1 overflow-x-auto no-scrollbar scroll-smooth">
                     <button onClick={() => handleBulkAction('ai')} className="flex flex-col items-center gap-1 shrink-0" title="AI 分析">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20 active:scale-95 transition-all">
                           <Sparkles size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-white/60">AI 識別</span>
                     </button>
                     
                     <button onClick={() => handleBulkAction('batch')} className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all">
                           <Pencil size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-white/60">批量編輯</span>
                     </button>

                     <button onClick={() => handleBulkAction('remove')} className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/20 active:scale-95 transition-all">
                           <Layers size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-white/60">移出組</span>
                     </button>

                     <button 
                       onClick={() => setSelectedPhotoIds(selectedPhotoIds.length === activeGroupPhotos.length ? [] : activeGroupPhotos.map(p => p.id))} 
                       className="flex flex-col items-center gap-1 shrink-0 px-2"
                     >
                        <div className="w-10 h-10 rounded-xl bg-white/5 text-white/80 flex items-center justify-center border border-white/5 active:scale-95 transition-all">
                           {selectedPhotoIds.length === activeGroupPhotos.length ? <X size={18} /> : <Check size={18} />}
                        </div>
                        <span className="text-[10px] font-bold text-white/60">{selectedPhotoIds.length === activeGroupPhotos.length ? '取消' : '全選'}</span>
                     </button>
                  </div>

                  <div className="w-px h-8 bg-white/10" />
                  <button onClick={() => { setIsMultiSelectMode(false); setSelectedPhotoIds([]); }} className="p-2 text-white/40 hover:text-white">
                     <X size={20} />
                  </button>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Floating Lightbox Overlay */}
           <AnimatePresence>
             {focusedGroupPhotoId && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-12"
                 onClick={() => setFocusedGroupPhotoId(null)}
               >
                 <img 
                   src={activeGroupPhotos.find(p => p.id === focusedGroupPhotoId)?.uri || activeGroupPhotos.find(p => p.id === focusedGroupPhotoId)?.image_url} 
                   className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                   referrerPolicy="no-referrer"
                 />
                 <button className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                   <Plus size={24} className="rotate-45" />
                 </button>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Quick Action Modals */}
           <AnimatePresence>
             {modalType && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm"
                    onClick={() => setModalType(null)}
                  />
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="fixed bottom-0 left-0 right-0 z-[510] bg-white rounded-t-[3rem] p-8 pb-12 shadow-2xl max-h-[85vh] overflow-y-auto"
                  >
                     <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                     
                     {modalType === 'tags' && currentModalPhoto && (
                       <div className="space-y-6">
                         <div className="flex items-center gap-3 mb-6">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                             <Type size={24} />
                           </div>
                           <div>
                             <h3 className="text-xl font-black text-slate-800">編輯標籤 / Edit Tags</h3>
                             <p className="text-xs font-bold text-slate-400">點擊切換選擇 / Click to toggle selection</p>
                           </div>
                         </div>
                         
                         <div className="flex flex-wrap gap-2">
                           {allTags.map(tag => {
                             const isSelected = (currentModalPhoto.tagIds || []).includes(tag.id);
                             return (
                               <button 
                                 key={tag.id}
                                 onClick={() => handleToggleTag(currentModalPhoto, tag.id)}
                                 className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 flex items-center gap-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
                               >
                                 {tag.name}
                                 {isSelected && <Check size={14} />}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}

                     {modalType === 'dims' && currentModalPhoto && (
                       <div className="space-y-6">
                         <div className="flex items-center gap-3 mb-6">
                           <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                             <Maximize size={24} />
                           </div>
                           <div>
                             <h3 className="text-xl font-black text-slate-800">設置尺寸 / Set Dimensions</h3>
                             <p className="text-xs font-bold text-slate-400">選擇常用尺寸或自定義 / Select preset or custom</p>
                           </div>
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                           {DIMENSION_PRESETS.map(preset => (
                             <button 
                               key={preset}
                               onClick={() => handleSetDim(currentModalPhoto, preset)}
                               className={`p-4 rounded-3xl border-2 font-black text-lg transition-all active:scale-95 ${currentModalPhoto.dimensions?.[0]?.label === preset ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' : 'bg-white border-slate-100 text-slate-600'}`}
                             >
                               {preset} <span className="text-sm font-bold opacity-60">CM</span>
                             </button>
                           ))}
                         </div>
                         
                         <div className="pt-4 flex gap-2">
                            <input 
                              placeholder="自定義尺寸 (Custom)... 如 150x85"
                              value={customDim}
                              onChange={(e) => setCustomDim(e.target.value)}
                              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold placeholder:text-slate-300 outline-none focus:border-green-500"
                            />
                            <button 
                              onClick={() => { if (customDim) handleSetDim(currentModalPhoto, customDim); }}
                              className="bg-slate-800 text-white px-6 rounded-2xl font-bold active:scale-95 transition-all"
                            >
                              保存
                            </button>
                         </div>
                       </div>
                     )}

                     {modalType === 'note' && (
                       <div className="space-y-6">
                         <div className="flex items-center gap-3 mb-6">
                           <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                             <MessageSquare size={24} />
                           </div>
                           <div>
                             <h3 className="text-xl font-black text-slate-800">照片備註 / Photo Notes</h3>
                             <p className="text-xs font-bold text-slate-400">輸入備註內容，按 Enter 保存 / Enter text to save</p>
                           </div>
                         </div>

                         <textarea 
                           className="w-full h-40 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-amber-500"
                           placeholder="輸入備註內容... (Type your note here)"
                           value={noteInput}
                           onChange={(e) => setNoteInput(e.target.value)}
                         />
                         
                         <button 
                           onClick={handleSaveNote}
                           className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                         >
                           <Save size={20} /> 完成並保存 / Done & Save
                         </button>
                       </div>
                     )}
                  </motion.div>
                </>
             )}
           </AnimatePresence>

           {/* Toast Notification */}
           <AnimatePresence>
             {toastMessage && (
               <motion.div 
                 initial={{ opacity: 0, y: 50, x: '-50%' }}
                 animate={{ opacity: 1, y: 0, x: '-50%' }}
                 exit={{ opacity: 0, y: 50, x: '-50%' }}
                 className="fixed bottom-24 left-1/2 z-[1000] bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2"
               >
                 <Check size={16} className="text-green-400" />
                 {toastMessage}
               </motion.div>
             )}
           </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
