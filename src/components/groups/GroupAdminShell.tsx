import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Edit3, Settings2, Plus, ChevronLeft, ChevronRight, ChevronDown, Layers, Pencil, Sparkles, 
  Star, ArrowLeft, ArrowRight, MoreVertical, Trash2, Check, 
  Maximize, MessageSquare, Type, Save, Trash, AlertCircle, Tag as TagIcon, Eye, EyeOff
} from 'lucide-react';
import { Photo, Tag, Category, ProductGroup } from '../../types';
import { updatePhotosGroupInCloud, updatePhoto, savePhotoToCloud } from '../../services/photoService';
import { getGroupById, saveGroupToCloud } from '../../services/groupService';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupGridView } from './GroupGridView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export interface GroupAdminShellProps {
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
  manufacturers?: any[];
  isStaffMode?: boolean;
  contactWhatsApp?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  lang?: string;
  t?: any;
  categories?: any[];
  tagMap?: Record<string, string>;
  allTags?: Tag[];
  isMultiSelect?: boolean;
  setAlertDialog?: (d: any) => void;
}

import { useGroupSync } from '../../hooks/useGroupSync';
import { useAdminUI } from '../../context/AdminContexts';

const DIMENSION_PRESETS = ['120x60', '140x80', '160x90'];

export const GroupAdminShell: React.FC<GroupAdminShellProps> = ({
  activeGroupId, setActiveGroupId, photos,
  isAdminMode, onEditPhoto,
  onBatchEdit, onUngroup, onAddPhotoToGroup,
  setPhotos, updateGroupPhotos, onAiAnalyze, onCancelAnalyze, isAnalyzing, onBatchAiAnalyze,
  manufacturers = [],
  isStaffMode = false,
  contactWhatsApp = () => {},
  onToggleHidden = () => {},
  lang = 'zh',
  t, categories, tagMap, allTags = [],
  setAlertDialog
}) => {
  const { syncCategory, syncTags, setCover } = useGroupSync(activeGroupId);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos
      .filter(p => p.groupId === activeGroupId && (isAdminMode || !p.isHidden))
      .sort((a, b) => {
        if (a.isGroupCover) return -1;
        if (b.isGroupCover) return 1;
        if (a.groupOrder !== undefined && b.groupOrder !== undefined) {
          return a.groupOrder - b.groupOrder;
        }
        return (a.item_code || '').localeCompare(b.item_code || '');
      });
  }, [activeGroupId, photos]);

  const groupCover = useMemo(() => activeGroupPhotos.find(p => p.isGroupCover) || activeGroupPhotos[0], [activeGroupPhotos]);
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupIdRef = useRef(activeGroupId);
  
  useEffect(() => {
    if (activeGroupId) {
      groupIdRef.current = activeGroupId;
      // Fetch group data
      getGroupById(activeGroupId).then(data => {
        if (data) {
          setGroupData(data);
        } else {
          setGroupData({
            id: activeGroupId,
            name: '',
            description: '',
            colors: [],
            materials: [],
            cover_photo_id: groupCover?.id || null,
            user_id: groupCover?.userId || 'default',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
    } else {
      setGroupData(null);
    }
  }, [activeGroupId, groupCover?.id, groupCover?.userId]);

  useEffect(() => {
    if (isMultiSelectMode && selectedPhotoIds.length === 0) {
      setIsMultiSelectMode(false);
    }
  }, [selectedPhotoIds.length, isMultiSelectMode]);

  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[] } | null>(null);

  const confirmBulkRemove = (ids: string[]) => {
    setConfirmDelete({ ids });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const persistPhotoChange = async (photoId: string, updates: Partial<Photo>) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    const updatedPhoto = { ...photo, ...updates, updatedAt: new Date().toISOString() };
    
    // 1. Update UI
    setPhotos?.(prev => prev.map(p => p.id === photoId ? updatedPhoto : p));

    // 2. Sync to cloud
    try {
      if (updates.tagIds) {
        // use local instance if available or 'default'
        await savePhotoToCloud((photo as any).userId || 'default', updatedPhoto);
      } else {
        await updatePhoto(photoId, updates);
      }
      showToast('已保存 / Saved');
    } catch (err: any) {
      showToast(`保存失敗: ${err.message}`);
    }
  };

  const handleUpdateGroupData = async (updates: Partial<ProductGroup>) => {
    if (!activeGroupId || !groupData) return;

    const nextGroupData = { ...groupData, ...updates };
    setGroupData(nextGroupData);
    
    showToast('群組資料已更新 / Group info updated');

    try {
      await saveGroupToCloud(nextGroupData);
    } catch (err: any) {
      showToast(`保存失敗: ${err.message}`);
    }
  };

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
        updatedWithOrder.map(p => updatePhoto(p.id, { groupOrder: p.groupOrder }))
      );
      showToast('排序已保存');
    } catch (err: any) {
      showToast(`排序同步失敗: ${err.message}`);
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
      confirmBulkRemove(selectedPhotoIds);
    } else if (action === 'batch') {
      onBatchEdit?.(selectedPhotoIds);
      setIsMultiSelectMode(false);
      setSelectedPhotoIds([]);
    }
  };

  return (
    <>
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量移出</AlertDialogTitle>
            <AlertDialogDescription>
              確定要將選中的 {confirmDelete?.ids.length} 張照片移出群組嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>
              取消 / CANCEL
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (confirmDelete) {
                    setPhotos?.(prev => prev.map(p => 
                      confirmDelete.ids.includes(p.id) ? { ...p, groupId: null } : p
                    ));
                    try {
                      await updatePhotosGroupInCloud(confirmDelete.ids, { group_id: null });
                      setIsMultiSelectMode(false);
                      setSelectedPhotoIds([]);
                      showToast('已移出 / Removed');
                    } catch (err: any) {
                      showToast(`操作失败: ${err.message}`);
                    }
                    setConfirmDelete(null);
                }
              }}
            >
              确定移出 / CONFIRM
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence mode="wait">
        {activeGroupId !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                
                <div 
                  className="flex flex-col cursor-pointer group"
                  onClick={() => {
                    if (isAdminMode) {
                      setShowGroupSettings(true);
                      setEditingGroupName(groupData?.name || activeGroupPhotos[0]?.name || '');
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                      {groupData?.name || activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                    </h2>
                    {isAdminMode && <Pencil size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {groupData?.name ? `封面產品: ${activeGroupPhotos[0]?.name || ''}` : `${activeGroupPhotos.length} 張照片 / Photos`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 {isAdminMode && (
                   <div className="flex items-center gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => {
                          if (onBatchAiAnalyze) {
                            onBatchAiAnalyze(activeGroupPhotos);
                          }
                        }}
                        className="hidden sm:flex px-3 h-10 items-center justify-center border border-[#7A00E6]/20 rounded-xl bg-[#F3E8FF] text-[#7A00E6] font-bold shadow-sm active:scale-95 transition-all gap-1.5"
                        title="AI 整組處理"
                      >
                        <Sparkles size={16} />
                        <span className="text-xs">AI</span>
                      </button>

                        <button onClick={() => setShowGroupSettings(true)} className="w-10 h-10 flex items-center justify-center border border-indigo-200 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all" title="群組資料庫">
                          <Settings2 size={18} />
                        </button>
                      <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all">
                          <MoreVertical size={18} />
                        </button>
                        {showMenu && <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[200]">
                           <button 
                             onClick={() => {
                               const ids = selectedPhotoIds.length > 0 ? selectedPhotoIds : activeGroupPhotos.map(p => p.id);
                               onBatchEdit?.(ids);
                               setIsMultiSelectMode(false);
                               setSelectedPhotoIds([]);
                               setShowMenu(false);
                             }}
                             className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                             <Pencil size={16} /> 批量編輯 / Batch Edit
                           </button>
                           <button 
                             onClick={() => {
                               if (onBatchAiAnalyze) onBatchAiAnalyze(activeGroupPhotos);
                               setShowMenu(false);
                             }}
                             className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                           >
                             <Sparkles size={16} /> AI 識別 / AI Identify
                           </button>
                         </div>
                       }
                     </div>

                      <button onClick={onAddPhotoToGroup} className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                        <Plus size={18} />
                      </button>
                    </div>
                 )}
                 {!isAdminMode && (
                   <button onClick={() => setActiveGroupId(null)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                     <X size={24} />
                   </button>
                 )}
                 {isAdminMode && (
                   <button onClick={() => setActiveGroupId(null)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors ml-2 border border-slate-200 bg-white">
                     <X size={20} />
                   </button>
                 )}
              </div>
           </div>

           <GroupGridView 
             photos={activeGroupPhotos}
             isMultiSelectMode={isMultiSelectMode}
             selectedPhotoIds={selectedPhotoIds}
             onPhotoClick={(photo) => {
               if (isMultiSelectMode) {
                 setSelectedPhotoIds(prev => 
                   prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
                 );
               } else {
                 setFocusedGroupPhotoId(photo.id);
               }
             }}
             onPhotoContextMenu={(e, photo) => {
               if (e && typeof e.preventDefault === 'function') e.preventDefault();
               if (isAdminMode) {
                 setIsMultiSelectMode(true);
                 setSelectedPhotoIds([photo.id]);
                 if ('vibrate' in navigator) navigator.vibrate(50);
               }
             }}
             getPhotoProps={(photo) => ({
               draggable: isAdminMode && !isMultiSelectMode,
               onDragStart: () => setDraggedPhotoId(photo.id),
               onDragOver: (e: any) => e.preventDefault(),
               onDrop: (e: any) => {
                 if (e && typeof e.preventDefault === 'function') e.preventDefault();
                 if (draggedPhotoId) {
                   handleReorder(draggedPhotoId, photo.id);
                   setDraggedPhotoId(null);
                 }
               }
             })}
           />
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

            {/* Group Settings Drawer */}
            <AnimatePresence>
              {showGroupSettings && (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="fixed inset-y-0 right-0 z-[500] w-full sm:w-[400px] bg-white shadow-2xl flex flex-col border-l border-slate-100"
                >
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                      <Settings2 size={20} />
                      <h3 className="font-black text-lg tracking-tight">群組資料庫 / DB</h3>
                    </div>
                    <button onClick={() => setShowGroupSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                    {/* Series Identity */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">系列基本信息 / Series Identity</h4>
                      </div>
                      
                      <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">系列正式名稱 (Group Display Name)</label>
                          <input 
                            value={groupData?.name || ''}
                            onChange={(e) => handleUpdateGroupData({ name: e.target.value })}
                            className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
                            placeholder="例如: 意式極簡沙發系列..."
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">系列共同故事 (中文)</label>
                            <textarea 
                              value={groupData?.description_translations?.zh || groupData?.description || ''}
                              onChange={(e) => {
                                const zh = e.target.value;
                                handleUpdateGroupData({ 
                                  description: zh, 
                                  description_translations: { ...groupData?.description_translations, zh } 
                                });
                              }}
                              className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-24 resize-none"
                              placeholder="描述這個系列的設計理念 (中文)..."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Series Story (English)</label>
                            <textarea 
                              value={groupData?.description_translations?.en || ''}
                              onChange={(e) => {
                                const en = e.target.value;
                                handleUpdateGroupData({ 
                                  description_translations: { ...groupData?.description_translations, en } 
                                });
                              }}
                              className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-24 resize-none"
                              placeholder="Describe the series design concept (English)..."
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cerita Siri (Malay)</label>
                            <textarea 
                              value={groupData?.description_translations?.ms || ''}
                              onChange={(e) => {
                                const ms = e.target.value;
                                handleUpdateGroupData({ 
                                  description_translations: { ...groupData?.description_translations, ms } 
                                });
                              }}
                              className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-24 resize-none"
                              placeholder="Terangkan konsep reka bentuk siri (Bahasa Melayu)..."
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* DNA Elements */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={16} className="text-indigo-500" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">系列DNA / DNA Elements</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">系列配色库 (Colors)</label>
                           <div className="flex flex-wrap gap-2">
                              {(groupData?.colors || []).map((color: string, idx: number) => (
                                <div key={idx} className="group relative">
                                  <div className="w-8 h-8 rounded-lg border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                                  <button 
                                    onClick={() => {
                                      const next = (groupData?.colors || []).filter((_, i) => i !== idx);
                                      handleUpdateGroupData({ colors: next });
                                    }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={8} />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const c = prompt('Color Code:');
                                  if (c) handleUpdateGroupData({ colors: [...(groupData?.colors || []), c] });
                                }}
                                className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-indigo-400"
                              >
                                <Plus size={16} />
                              </button>
                           </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">系列材質庫 (Materials)</label>
                           <div className="flex flex-wrap gap-1.5">
                             {['實木', '真皮', '金屬', '布藝', '岩板', '鋼化玻璃'].map(mat => {
                               const isSelected = (groupData?.materials || []).includes(mat);
                               return (
                                 <button 
                                   key={mat}
                                   onClick={() => {
                                     const current = groupData?.materials || [];
                                     const next = isSelected ? current.filter(m => m !== mat) : [...current, mat];
                                     handleUpdateGroupData({ materials: next });
                                   }}
                                   className={`px-2.5 py-1 rounded-lg text-[9px] font-black border-2 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                                 >
                                   {mat}
                                 </button>
                               )
                             })}
                           </div>
                        </div>
                      </div>
                    </section>

                    {/* Disband Actions */}
                    <section className="pt-6 border-t border-slate-100 space-y-4">
                       <button 
                         onClick={() => {
                           if (onUngroup && activeGroupId) {
                             setAlertDialog?.({
                               title: '確定要解散整個群組？',
                               message: '解散後，群組關係、排序信息及DNA數據將被移除，照片將變回單張展示。',
                               onConfirm: async () => {
                                 try {
                                   if (onUngroup) await (onUngroup(activeGroupId) as any);
                                   setActiveGroupId(null);
                                   setShowGroupSettings(false);
                                   setAlertDialog?.(null);
                                 } catch (e) {
                                   console.error('Failed to ungroup:', e);
                                   setAlertDialog?.(null);
                                 }
                               }
                             });
                           }
                         }}
                         className="w-full py-4 rounded-2xl border-2 border-red-50 border-dashed text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 font-black text-xs uppercase"
                       >
                         <Trash2 size={16} /> 解散群組 / Disband Group
                       </button>
                    </section>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

           {/* Unified Photo Lightbox */}
           <AnimatePresence>
             {focusedGroupPhotoId && (() => {
                 const currentIndex = activeGroupPhotos.findIndex(p => p.id === focusedGroupPhotoId);
                 const photo = activeGroupPhotos[currentIndex];
                 if (!photo) return null;

                 return (
                    <PhotoLightbox 
                      photo={photo}
                      displayPhotos={activeGroupPhotos}
                      index={currentIndex}
                      onClose={() => setFocusedGroupPhotoId(null)}
                      onPrev={() => {
                        const prev = currentIndex > 0 ? currentIndex - 1 : activeGroupPhotos.length - 1;
                        setFocusedGroupPhotoId(activeGroupPhotos[prev].id);
                      }}
                      onNext={() => {
                        const next = currentIndex < activeGroupPhotos.length - 1 ? currentIndex + 1 : 0;
                        setFocusedGroupPhotoId(activeGroupPhotos[next].id);
                      }}
                      t={t}
                      lang={lang}
                      categories={categories || []}
                      manufacturers={manufacturers}
                      tagMap={tagMap || {}}
                      isAdminMode={isAdminMode}
                      isStaffMode={isStaffMode}
                      contactWhatsApp={contactWhatsApp}
                      onUngroup={(photoId) => {
                        confirmBulkRemove([photoId]);
                        setFocusedGroupPhotoId(null);
                      }}
                      onSetGroupCover={(photoId, groupId) => setCover(photoId)}
                      onEditPhoto={onEditPhoto}
                      onToggleHidden={(p) => persistPhotoChange(p.id, { isHidden: !p.isHidden })}
                      onAiAnalyze={onAiAnalyze}
                      onCancelAnalyze={onCancelAnalyze}
                      isAnalyzing={isAnalyzing}
                    />
                 );
             })()}
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
    </>
  );
};
