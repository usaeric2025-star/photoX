import React, { useEffect } from 'react';
import { PublicGallery } from './PublicGallery';
import { useOptionalAdminPhoto, useOptionalAdminUI, useOptionalAdminSession } from '../context/AdminContexts';
import { useGalleryContext } from '../context/GalleryContext';
import { Layers, Pencil, Trash2, Share2, X } from 'lucide-react';
import { translations, LanguageCode } from '../lib/translations';
import { updatePhoto } from '../services/photoMutationService';
import { usePhotoUpdate } from '../hooks/usePhotoUpdate';
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
  } = useGalleryContext();

  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] || translations['en'];

  const { updatePhoto } = usePhotoUpdate();
  const { setAvoidingSelection } = useTasks();

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
      console.error("[ERROR] Failed to toggle pinned:", e);
      adminUI?.showToast(`置顶失败: 无法同步到服务器。`, 'error');
    }
  };

  const handleToggleHidden = async (photo: Photo) => {
    const newStatus = !photo.isHidden;
    try {
      await updatePhoto(photo.id, { isHidden: newStatus });
      adminUI?.showToast(newStatus ? '已设置为隐藏' : '已设置为显示', 'success');
    } catch (e) {
      console.error("[ERROR] Failed to toggle hidden:", e);
      adminUI?.showToast(`操作失败: 无法更新隐藏状态。`, 'error');
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

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    
    adminUI?.setAlertDialog({
      title: `确定要删除这 ${selectedIds.length} 张照片吗？`,
      message: '删除后无法恢复，云端的文件也将被移除。',
      onConfirm: async () => {
        try {
          // Identify groups before deletion
          const groupsToCheck = new Set(photos.filter(p => selectedIds.includes(p.id) && p.groupId).map(p => p.groupId));
          
          await adminPhoto?.deletePhoto(selectedIds, true);
          clearSelection();
          
          // Check groups after deletion
          for (const groupId of groupsToCheck) {
              const remainingPhotos = photos.filter(p => p.groupId === groupId && !selectedIds.includes(p.id));
              if (remainingPhotos.length <= 1) {
                  // Dissolve group: clear group_id for remaining photo if any, and delete group metadata
                  if (remainingPhotos.length === 1) {
                      await updatePhoto(remainingPhotos[0].id, { groupId: null, isGroupCover: false });
                  }
                  // Delete group metadata
                  await adminPhoto?.deleteGroup(groupId as string);
                  adminUI?.showToast(`群组 ${groupId!.slice(-4)} 已自动解散`, 'info');
              }
          }

          adminUI?.showToast(`已成功删除 ${selectedIds.length} 张照片`, 'success');
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          adminUI?.showToast(`删除失败: ${error.message}`, 'error');
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
        adminUI?.showToast(`${t.shareTitle}: ${t.shareNotSupported}`, 'error');
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error("[ERROR] Batch share failed:", e);
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
             const error = err instanceof Error ? err : new Error(String(err));
             adminUI?.showToast(`设置封面失败: ${error.message}`, 'error');
          }
        }}
        user={adminSession?.user}
        settings={adminSession?.settings}
        isRefreshing={adminSession?.isSyncing}
        onRefresh={() => adminSession?.onRefresh?.()}
      />

      {/* Admin Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-[#1D3557] px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300 transition-all">
           <div className="bg-white/10 px-2 py-1 rounded-lg">
             <span className="text-xs font-black text-white">{selectedIds.length}</span>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={handleGroup} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 border border-white/10" title={t.merge}><Layers size={18} /></button>
             <button onClick={handleBatchEdit} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 border border-white/10" title="统一编辑"><Pencil size={18} /></button>
             <button onClick={handleBatchDelete} className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-xl flex items-center justify-center text-red-400 transition-all active:scale-95 border border-red-500/20" title={t.delete}><Trash2 size={18} /></button>
             <button onClick={handleBatchShare} className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 transition-all active:scale-95 border border-blue-500/20" title={t.share}><Share2 size={18} /></button>
           </div>
           <div className="w-px h-6 bg-white/10 mx-1" />
           <button onClick={clearSelection} className="p-2 text-white/40 hover:text-white transition-colors"><X size={18} /></button>
        </div>
      )}
    </div>
  );
};
