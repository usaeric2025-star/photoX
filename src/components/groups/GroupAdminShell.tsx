import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  X, Edit3, Settings2, Plus, ChevronLeft, ChevronRight, ChevronDown, Layers, Pencil, Sparkles, 
  Star, ArrowLeft, ArrowRight, MoreVertical, Trash2, Check, 
  Maximize, MessageSquare, Type, Save, Trash, AlertCircle, Tag as TagIcon, Eye, EyeOff
} from 'lucide-react';
import { Photo, Tag, Category, ProductGroup, Manufacturer, Dimension } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { updatePhotosGroupInCloud } from '../../services/photoSyncService';
import { getGroupById, saveGroupToCloud } from '../../services/groupService';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupGridView } from './GroupGridView';

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
  manufacturers?: Manufacturer[];
  isStaffMode?: boolean;
  contactWhatsApp?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  lang?: string;
  t?: Record<string, any>;
  categories?: Category[];
  tagMap?: Record<string, string>;
  allTags?: Tag[];
  isMultiSelect?: boolean;
  setAlertDialog?: (d: { title: string; message: string; onConfirm: () => void } | null) => void;
  updatePhoto?: (id: string, updates: Partial<Photo>) => Promise<void>;
}

import { useGroupSync } from '../../hooks/useGroupSync';
import { useAdminUI } from '../../context/AdminContexts';
import { useErrorHandler } from '../../utils/errorHandler';

import { DimensionEditor } from '../admin/edit/DimensionEditor';

export const GroupAdminShell: React.FC<GroupAdminShellProps> = (props) => {
  const {
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
    setAlertDialog: propsSetAlertDialog,
    updatePhoto: hookUpdatePhoto
  } = props;

  const { setAlertDialog: contextSetAlertDialog, setPromptDialog } = useAdminUI();
  const setAlertDialog = propsSetAlertDialog || contextSetAlertDialog;
  const { handleError } = useErrorHandler();
  const { setCover } = useGroupSync(activeGroupId);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);

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
        if (a.groupOrder !== undefined) return -1;
        if (b.groupOrder !== undefined) return 1;
        return (a.item_code || '').localeCompare(b.item_code || '');
      });
  }, [activeGroupId, photos]);

  const groupCover = useMemo(() => activeGroupPhotos.find(p => p.isGroupCover) || activeGroupPhotos[0], [activeGroupPhotos]);
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupIdRef = useRef(activeGroupId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeGroupId && containerRef.current) {
      const saved = sessionStorage.getItem(`group_scroll_${activeGroupId}`);
      if (saved) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = parseInt(saved, 10);
          }
        }, 50);
      }
    }
  }, [activeGroupId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeGroupId) {
      sessionStorage.setItem(`group_scroll_${activeGroupId}`, e.currentTarget.scrollTop.toString());
    }
  };
  
  useEffect(() => {
    if (activeGroupId) {
      groupIdRef.current = activeGroupId;
      // Reset group data immediately to avoid showing stale data
      setGroupData(null);
      setIsGroupDataLoading(true);
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
        setIsGroupDataLoading(false);
      }).catch(() => setIsGroupDataLoading(false));
    } else {
      setGroupData(null);
      setIsGroupDataLoading(false);
    }
  }, [activeGroupId, groupCover?.id, groupCover?.userId]);

  useEffect(() => {
    if (isMultiSelectMode && selectedPhotoIds.length === 0) {
      setIsMultiSelectMode(false);
    }
  }, [selectedPhotoIds.length, isMultiSelectMode]);

  const confirmBulkRemove = (ids: string[]) => {
    setAlertDialog({
      title: '确认批量移出',
      message: `确定要将选中的 ${ids.length} 张照片移出群组吗？`,
      onConfirm: async () => {
        try {
          await updatePhotosGroupInCloud(ids, { group_id: null });
          setPhotos?.(prev => prev.map(p => 
            ids.includes(p.id) ? { ...p, groupId: null } : p
          ));
          setIsMultiSelectMode(false);
          setSelectedPhotoIds([]);
          toast.success('已移出 / Removed');
        } catch (err: any) {
          handleError(err, '批量移出失败');
        }
        setAlertDialog(null);
      }
    });
  };

  const persistPhotoChange = async (photoId: string, updates: Partial<Photo>) => {
    try {
      if (hookUpdatePhoto) {
        await hookUpdatePhoto(photoId, updates);
      } else {
         // Fallback if hook not passed (unlikely)
         const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
         await serviceUpdatePhoto(photoId, updates);
         setPhotos?.(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
      }
      toast.success('已保存 / Saved');
    } catch (err: any) {
      handleError(err, '保存照片修改失败');
    }
  };

  const handleUpdateGroupData = async (updates: Partial<ProductGroup>) => {
    if (!activeGroupId || !groupData) return;

    const nextGroupData = { ...groupData, ...updates };
    setGroupData(nextGroupData);
    
    toast.success('群组资料已更新 / Group info updated');

    try {
      await saveGroupToCloud(nextGroupData);
      
      // If isHidden changed, update all photos in this group
      if (updates.hasOwnProperty('isHidden')) {
        const isHidden = updates.isHidden;
        const groupPhotos = photos.filter(p => p.groupId === activeGroupId);
        if (groupPhotos.length > 0 && hookUpdatePhoto) {
           await Promise.all(
             groupPhotos.map(p => hookUpdatePhoto(p.id, { isHidden }))
           );
           setPhotos?.(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, isHidden: isHidden! } : p));
           toast.success(`群组内照片已${isHidden ? '屏蔽' : '显示'}`);
        }
      }
    } catch (err: any) {
      handleError(err, '更新群组资料失败');
    }
  };

  const handleToggleTag = (photo: Photo, tagId: string) => {
    const currentTags = Array.isArray(photo.tagIds) ? photo.tagIds : [];
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    persistPhotoChange(photo.id, { tagIds: nextTags });
  };

  const handleBatchUpdateDimensions = async (newDims: Dimension[]) => {
    if (!activeGroupId || newDims.length === 0) return;
    
    setAlertDialog({
      title: '确认批量修改尺寸',
      message: `确定要将群组内所有 ${activeGroupPhotos.length} 张照片的尺寸更新为当前设置吗？此操作不可撤销。`,
      onConfirm: async () => {
        try {
          const toastId = toast.loading('正在批量更新尺寸...');
          if (hookUpdatePhoto) {
            await Promise.all(
              activeGroupPhotos.map(p => hookUpdatePhoto(p.id, { dimensions: newDims }))
            );
          } else {
            const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
            await Promise.all(
              activeGroupPhotos.map(p => serviceUpdatePhoto(p.id, { dimensions: newDims }))
            );
            setPhotos?.(prev => prev.map(p => 
              p.groupId === activeGroupId ? { ...p, dimensions: newDims } : p
            ));
          }
          toast.success('批量更新成功', { id: toastId });
        } catch (err: any) {
          handleError(err, '批量更新尺寸失败');
        }
        setAlertDialog(null);
      }
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
    
    // Assign new orders
    const updatedPhotosWithOrder = nextGroupPhotos.map((p, index) => ({
      ...p,
      groupOrder: index
    }));

    setPhotos?.(prev => {
        const next = prev.map(p => {
          const found = updatedPhotosWithOrder.find(up => up.id === p.id);
          return found ? found : p;
        });
        return next;
    });
    
    try {
      const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
      
      // Persist each changed photo
      await Promise.all(
        updatedPhotosWithOrder.map(p => serviceUpdatePhoto(p.id, { groupOrder: p.groupOrder }))
      );
      
      toast.success('顺序已保存 / Order saved');
    } catch (err: any) {
      handleError(err, '保存排序失败');
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
      <AnimatePresence mode="wait">
        {activeGroupId !== null && (
          <motion.div 
            ref={containerRef}
            onScroll={handleScroll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-brand-bg overflow-y-auto pt-safe flex flex-col"
          >
           {/* Top Header */}
           <div className="sticky top-0 bg-brand-bg/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
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
                  <div className="flex items-center gap-2 min-h-[1.5rem]">
                    {isGroupDataLoading && activeGroupPhotos.length === 0 ? (
                      <Skeleton className="h-6 w-32 bg-slate-200" />
                    ) : (
                      <>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                          {groupData?.name || activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                        </h2>
                        {isAdminMode && <Pencil size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </>
                    )}
                  </div>
                  <div className="min-h-[0.8rem]">
                    {isGroupDataLoading ? (
                      <Skeleton className="h-3 w-40 mt-1 bg-slate-100" />
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {groupData?.name ? `封面产品: ${activeGroupPhotos[0]?.name || ''}` : `${activeGroupPhotos.length} 张照片 / Photos`}
                      </p>
                    )}
                  </div>
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

                        <button onClick={() => setShowGroupSettings(true)} className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-indigo-200 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all" title="群组数据库">
                          <Settings2 size={18} />
                        </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all">
                              <MoreVertical size={18} />
                            </button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[200]">
                          <DropdownMenuItem 
                            onClick={() => {
                              const ids = selectedPhotoIds.length > 0 ? selectedPhotoIds : activeGroupPhotos.map(p => p.id);
                              onBatchEdit?.(ids);
                              setIsMultiSelectMode(false);
                              setSelectedPhotoIds([]);
                            }}
                            className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                          >
                            <Pencil size={16} className="text-slate-500" />
                            <span className="text-sm font-bold text-slate-700">批量编辑 / Batch Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (onBatchAiAnalyze) onBatchAiAnalyze(activeGroupPhotos);
                            }}
                            className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                          >
                            <Sparkles size={16} className="text-purple-500" />
                            <span className="text-sm font-bold text-slate-700">AI 識別 / AI Identify</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button onClick={onAddPhotoToGroup} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
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
             getPhotoProps={useCallback((photo) => ({
               draggable: isAdminMode && !isMultiSelectMode,
               onDragStart: () => setDraggedPhotoId(photo.id),
               onDragOver: (e: React.DragEvent) => e.preventDefault(),
               onDrop: (e: React.DragEvent) => {
                 if (e && typeof e.preventDefault === 'function') e.preventDefault();
                 if (draggedPhotoId) {
                   handleReorder(draggedPhotoId, photo.id);
                   setDraggedPhotoId(null);
                 }
               }
             }), [isAdminMode, isMultiSelectMode, draggedPhotoId, handleReorder])}
           />

           {/* Multi-Select Floating Bar */}
           <AnimatePresence>
             {isMultiSelectMode && selectedPhotoIds.length > 0 && (
               <motion.div 
                 initial={{ y: 100, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: 100, opacity: 0 }}
                 className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-brand-navy px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-[320px]"
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
                        <span className="text-[10px] font-bold text-white/60">批量编辑</span>
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

            {/* Group Settings Sheet */}
            <Sheet open={showGroupSettings} onOpenChange={setShowGroupSettings}>
              <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 border-l border-slate-100 bg-white">
                <SheetHeader className="p-6 border-b border-slate-50 bg-indigo-600 text-white space-y-0 flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings2 size={20} />
                    <SheetTitle className="font-black text-lg tracking-tight text-white m-0">群组数据库 / DB</SheetTitle>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         if (onUngroup && activeGroupId) {
                           setAlertDialog?.({
                             title: '确定要解散整个群组？',
                             message: '解散后，群组关系、排序信息及DNA数据将被移除，照片将变回单张展示。',
                             onConfirm: async () => {
                               try {
                                 if (onUngroup && activeGroupId) {
                                   onUngroup(activeGroupId);
                                   setActiveGroupId(null);
                                   setShowGroupSettings(false);
                                 }
                                 setAlertDialog?.(null);
                               } catch (e) {
                                 handleError(e, '解散群组失败');
                                 setAlertDialog?.(null);
                               }
                             }
                           });
                         }
                       }}
                       className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                       title="解散群组"
                     >
                       <Trash2 size={18} />
                     </button>

                     <button 
                       onClick={() => setShowGroupSettings(false)}
                       className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white text-indigo-600 hover:bg-white shadow-xl transition-all font-black"
                       title="保存并关闭"
                     >
                       <Save size={18} />
                     </button>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide h-[calc(100vh-80px)] pb-20">
                    {/* Series Identity */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-1 justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">系列基本信息 / Series Identity</h4>
                        </div>
                        
                        <button 
                          onClick={() => handleUpdateGroupData({ isHidden: !groupData?.isHidden })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${groupData?.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
                        >
                           {groupData?.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                           <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{groupData?.isHidden ? '屏蔽中' : '显示中'}</span>
                        </button>
                      </div>
                      
                      <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">系列正式名称 (Group Display Name)</label>
                        <input 
                          value={groupData?.name || ''}
                          onChange={(e) => handleUpdateGroupData({ name: e.target.value })}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
                          placeholder="例如: 意式极简沙发系列..."
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

                  {/* Dimensions Section */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Maximize size={16} className="text-indigo-500" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">批量尺寸 / Dimensions (Batch)</h4>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold mb-4 px-1 leading-relaxed">
                        在下方设置尺寸后，可点击“应用到全组”批量更新该群组内的所有产品尺寸。
                      </p>
                      <DimensionEditor 
                        dimensions={groupData?.dimensions || []}
                        onChange={(newDims) => {
                           handleUpdateGroupData({ dimensions: newDims as any });
                        }}
                      />
                      
                      {(groupData?.dimensions || []).length > 0 && (
                        <button
                          onClick={() => handleBatchUpdateDimensions(groupData!.dimensions!)}
                          className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={14} />
                          <span>应用到全组 / Apply to Group</span>
                        </button>
                      )}
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
                                setPromptDialog({
                                  title: '新增系列配色 / Add Color',
                                  message: '輸入顏色十六進制碼 (例如: #FF0000) / Enter Color Hex Code:',
                                  placeholder: '#',
                                  onSubmit: (c) => {
                                    if (c && c.trim()) handleUpdateGroupData({ colors: [...(groupData?.colors || []), c.trim()] });
                                  }
                                });
                              }}
                              className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-indigo-400"
                            >
                              <Plus size={16} />
                            </button>
                         </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">系列材質库 (Materials)</label>
                         <div className="flex flex-wrap gap-1.5">
                           {['实木', '真皮', '金属', '布艺', '岩板', '钢化玻璃'].map(mat => {
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

                  <div className="h-12"></div>
                </div>
              </SheetContent>
            </Sheet>

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
                      onToggleHidden={(p) => {
                        const newStatus = !p.isHidden;
                        persistPhotoChange(p.id, { isHidden: newStatus });
                      }}
                      onAiAnalyze={onAiAnalyze}
                      onCancelAnalyze={onCancelAnalyze}
                      isAnalyzing={isAnalyzing}
                    />
                 );
             })()}
           </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
