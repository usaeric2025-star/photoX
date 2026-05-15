import { toast } from 'sonner';
import React, { useEffect } from 'react';
import { PublicGallery } from './PublicGallery';
import { useOptionalAdminPhoto, useOptionalAdminUI, useOptionalAdminSession } from '../context/AdminContexts';
import { useGallery } from '../hooks/useGallery';
import { Layers, Pencil, Trash2, Share2, X, EyeOff } from 'lucide-react';
import { translations, LanguageCode } from '../lib/translations';
import { useErrorHandler } from '../utils/errorHandler';
import { useTasks } from '../hooks/useTasks';
import { Photo } from '../types';



interface AdminGalleryShellProps {
  onExit: () => void;
}

export const AdminGalleryShell: React.FC<AdminGalleryShellProps> = ({ onExit }) => {
  const adminPhoto = useOptionalAdminPhoto();
  const adminUI = useOptionalAdminUI();
  const adminSession = useOptionalAdminSession();
  
  const { 
    photos, 
    categories,
    tags,
    selectedIds, 
    clearSelection, 
    setIsMultiSelect,
    isMultiSelect,
    togglePhotoSelection,
    setPhotos
  } = useGallery();

  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] || translations['en'];

  const { updatePhoto } = adminPhoto || {};
  const { setAvoidingSelection } = useTasks();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    setAvoidingSelection(selectedIds.length > 0);
  }, [selectedIds.length, setAvoidingSelection]);

  const handleTogglePinned = async (photo: Photo) => {
    const newStatus = !photo.isPinned;
    
    // Identify affected photos (the photo itself + any other photos in the same group)
    const affectedPhotos = photo.groupId 
      ? photos.filter(p => p.groupId === photo.groupId)
      : [photo];
    
    try {
      await Promise.all(
        affectedPhotos.map(p => 
          updatePhoto(p.id, { isPinned: newStatus })
        )
      );
    } catch (e) {
      handleError(e, '置顶状态切换失败');
    }
  };

  const handleToggleHidden = async (photo: Photo) => {
    const newStatus = !photo.isHidden;
    try {
      await updatePhoto(photo.id, { isHidden: newStatus });
      toast.success(newStatus ? '已设置为隐藏' : '已设置为显示');
    } catch (e) {
      handleError(e, '隐藏状态切换失败');
    }
  };

  const handleGroup = () => {
    if (selectedIds.length > 0) {
      adminPhoto?.handleGroupPhotos(selectedIds);
      clearSelection();
    }
  };

  const handleBatchEdit = () => {
    if (selectedIds.length > 0) {
      adminUI?.setBatchEditIds(selectedIds);
    }
  };

  const handleBatchHide = () => {
    if (selectedIds.length === 0) return;
    adminUI?.setAlertDialog({
      title: `确定要批量隐藏这 ${selectedIds.length} 张照片吗？`,
      message: '隐藏后的照片将不会在公共展厅中显示。',
      onConfirm: async () => {
        try {
          await adminPhoto?.updatePhotosBulk(selectedIds, { isHidden: true }, `批量隐藏 (${selectedIds.length} 张)`);
          clearSelection();
        } catch (e) {
          handleError(e, '批量隐藏失败');
        }
      }
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    
    adminUI?.setAlertDialog({
      title: `确定要删除这 ${selectedIds.length} 张照片吗？`,
      message: '删除后无法恢复，云端的文件也将被移除。',
      onConfirm: async () => {
        try {
          // Identify groups before deletion
          const groupsToCheck = new Set(photos.filter(p => selectedIds.includes(p.id) && p.groupId).map(p => p.groupId));
          
          await adminPhoto?.deletePhoto(selectedIds);
          clearSelection();
          
          // Check groups after deletion
          for (const groupId of groupsToCheck) {
              const remainingPhotos = photos.filter(p => p.groupId === groupId && !selectedIds.includes(p.id));
              if (remainingPhotos.length <= 1) {
                  // Dissolve group: clear group_id for remaining photo if any, and delete group metadata
                  if (remainingPhotos.length === 1) {
                      await updatePhoto!(remainingPhotos[0].id, { groupId: null, isGroupCover: false });
                  }
                  // Delete group metadata
                  await adminPhoto?.deleteGroup(groupId as string);
                  toast.info(`群组 ${groupId!.slice(-4)} 已自动解散`);
              }
          }
        } catch (e) {
          handleError(e, '批量删除失败');
        }
      }
    });
  };

  const handleBatchShare = async () => {
    const filtered = photos.filter(p => selectedIds.includes(p.id));
    const text = filtered.map(p => p.name || t.furniture).join(', ');
    try {
      if (navigator.share) {
        await navigator.share({ 
          title: t.shareTitle, 
          text: t.shareMsgCount(selectedIds.length, text), 
          url: window.location.origin 
        });
      } else {
        toast.error(`${t.shareTitle}: ${t.shareNotSupported}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        handleError(e, '批量分享失败');
      }
    }
  };

  return (
    <div className="relative h-full w-full">
      <PublicGallery 
        photos={photos}
        categories={categories}
        tags={tags}
        isAdminMode={true}
        onTogglePinned={handleTogglePinned}
        onToggleHidden={handleToggleHidden}
        onExit={onExit}
        showExit={true}
        hideHeader={true}
        onEditPhoto={(id) => adminUI?.setEditPhotoId(id)}
        onBatchEdit={(ids) => adminUI?.setBatchEditIds(ids)}
        onGroupPhotos={(ids) => adminPhoto?.handleGroupPhotos(ids)}
        onAddPhoto={() => {
           const input = document.createElement('input');
           input.type = 'file';
           input.accept = 'image/*';
           input.multiple = true;
           input.onchange = (e) => adminPhoto?.handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false);
           input.click();
        }}
        selectedIds={selectedIds}
        isMultiSelect={isMultiSelect}
        onToggleSelection={togglePhotoSelection}
        onClearSelection={clearSelection}
        onToggleMultiSelect={() => setIsMultiSelect(!isMultiSelect)}
        onAiAnalyze={(p) => adminPhoto?.handleSingleAiAnalyze(p.uri!, p.categoryId || undefined)}
        onBatchAiAnalyze={(photos) => adminPhoto?.handleGroupAiIdentify(photos)}
        onCancelAnalyze={() => adminUI?.abortAnalysis()}
        isAnalyzing={adminUI?.loadingState === 'analyzing'}
        setAlertDialog={(d) => adminUI?.setAlertDialog(d)}
        onSetGroupCover={async (id, groupId) => {
          setPhotos(prev => prev.map(p => {
             if (p.groupId !== groupId) return p;
             return { ...p, isGroupCover: p.id === id };
          }));
          const groupPhotos = photos.filter(p => p.groupId === groupId);
          try {
             await Promise.all(
                groupPhotos.map(p => updatePhoto(p.id, { isGroupCover: p.id === id }))
             );
          } catch (err) {
             handleError(err, '设置封面失败');
          }
        }}
        user={adminSession?.user}
        settings={adminSession?.settings}
        isRefreshing={adminSession?.isSyncing}
        onRefresh={() => adminSession?.onRefresh?.()}
      />

      {/* Admin Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[500] flex items-center gap-3 bg-brand-navy px-4 sm:px-6 py-4 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300 transition-all">
           <div className="bg-white/10 px-3 py-1 rounded-full flex items-center justify-center min-w-[2.5rem]">
             <span className="text-xs font-black text-white">{selectedIds.length}</span>
           </div>
           <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-around sm:justify-start overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
             <button onClick={handleGroup} className="w-12 h-12 sm:w-11 sm:h-11 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90 border border-white/10 shrink-0" title={t.merge}><Layers size={20} /></button>
             <button onClick={handleBatchEdit} className="w-12 h-12 sm:w-11 sm:h-11 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90 border border-white/10 shrink-0" title="统一编辑"><Pencil size={20} /></button>
             <button onClick={handleBatchDelete} className="w-12 h-12 sm:w-11 sm:h-11 bg-red-500/20 hover:bg-red-500/30 rounded-2xl flex items-center justify-center text-red-400 transition-all active:scale-90 border border-red-500/20 shrink-0" title={t.delete}><Trash2 size={20} /></button>
             <button onClick={handleBatchHide} className="w-12 h-12 sm:w-11 sm:h-11 bg-slate-500/20 hover:bg-slate-500/30 rounded-2xl flex items-center justify-center text-slate-300 transition-all active:scale-90 border border-slate-500/20 shrink-0" title="批量隐藏"><EyeOff size={20} /></button>
             <button onClick={handleBatchShare} className="w-12 h-12 sm:w-11 sm:h-11 bg-blue-500/20 hover:bg-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 transition-all active:scale-90 border border-blue-500/20 shrink-0" title={t.share}><Share2 size={20} /></button>
           </div>
           <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
           <button onClick={clearSelection} className="p-3 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>
      )}
    </div>
  );
};
