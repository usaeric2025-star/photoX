import React from 'react';
import { PublicGallery } from './PublicGallery';
import { useOptionalAdminPhoto, useOptionalAdminUI, useOptionalAdminSession } from '../context/AdminContexts';
import { useGalleryContext } from '../context/GalleryContext';
import { Layers, Pencil, Trash2, Share2, X } from 'lucide-react';
import { translations } from '../lib/translations';
import { updatePhotoInCloud } from '../services/photoService';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminGalleryShellProps {
  onExit: () => void;
}

export const AdminGalleryShell: React.FC<AdminGalleryShellProps> = ({ onExit }) => {
  const adminPhoto = useOptionalAdminPhoto();
  const adminUI = useOptionalAdminUI();
  const adminSession = useOptionalAdminSession();
  const [confirmDelete, setConfirmDelete] = React.useState<boolean>(false);
  
  const { 
    photos, 
    selectedIds, 
    clearSelection, 
    setIsMultiSelect,
    isMultiSelect,
    togglePhotoSelection,
    setPhotos
  } = useGalleryContext();

  const lang = (localStorage.getItem('appLang') as any) || 'en';
  const t = translations[lang] || translations['en'];

  const handleTogglePinned = async (photo: any) => {
    const newStatus = !photo.isPinned;
    
    // Identify affected photos (the photo itself + any other photos in the same group)
    const affectedPhotos = photo.groupId 
      ? photos.filter(p => p.groupId === photo.groupId)
      : [photo];
      
    // Optimistic update for all affected photos
    setPhotos(prev => prev.map(p => 
      affectedPhotos.some(ap => ap.id === p.id) 
        ? { ...p, isPinned: newStatus } 
        : p
    ));
    
    try {
      await Promise.all(
        affectedPhotos.map(p => 
          updatePhotoInCloud(p.id, { is_pinned: newStatus, updated_at: new Date().toISOString() })
        )
      );
    } catch (e: any) {
      console.error("[ERROR] Failed to toggle pinned:", e);
      // Revert changes
      setPhotos(prev => prev.map(p => 
        affectedPhotos.some(ap => ap.id === p.id) 
          ? { ...p, isPinned: !newStatus } 
          : p
      ));
      adminUI?.setAlertDialog({ title: '置顶失败', message: '无法同步到服务器。' });
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

  const handleBatchDelete = async () => {
    if (selectedIds.length > 0) {
      setConfirmDelete(true);
    }
  };

  const executeBatchDelete = async () => {
    if (selectedIds.length > 0) {
      await adminPhoto?.deletePhoto(selectedIds);
      clearSelection();
      setConfirmDelete(false);
    }
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
        adminUI?.setAlertDialog({ title: t.shareTitle, message: t.shareNotSupported });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("[ERROR] Batch share failed:", e);
      }
    }
  };

  return (
    <div className="relative h-full w-full">
      <PublicGallery 
        isAdminMode={true}
        onTogglePinned={handleTogglePinned}
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
           input.onchange = (e) => adminPhoto?.handlePhotoImport(e as any, false);
           input.click();
        }}
        selectedIds={selectedIds}
        isMultiSelect={isMultiSelect}
        onToggleSelection={togglePhotoSelection}
        onClearSelection={clearSelection}
        onToggleMultiSelect={setIsMultiSelect}
        onAiAnalyze={(p) => adminPhoto?.handleSingleAiAnalyze(p.uri!, p.categoryId || undefined)}
        onBatchAiAnalyze={(photos) => adminPhoto?.handleGroupAiIdentify(photos)}
        onCancelAnalyze={() => adminUI?.abortAnalysis()}
        isAnalyzing={adminUI?.loadingState === 'analyzing'}
        setAlertDialog={(d) => adminUI?.setAlertDialog(d)}
        setLoadingState={(s) => adminUI?.setLoadingState(s)}
        onSetGroupCover={async (id, groupId) => {
          setPhotos(prev => prev.map(p => {
             if (p.groupId !== groupId) return p;
             return { ...p, isGroupCover: p.id === id };
          }));
          const groupPhotos = photos.filter(p => p.groupId === groupId);
          import('../services/supabaseService').then(async (m) => {
             try {
                await Promise.all(
                   groupPhotos.map(p => m.updatePhotoInCloud(p.id, { is_group_cover: p.id === id }))
                );
             } catch (err: any) {
                adminUI?.setAlertDialog({ title: '設置封面失敗', message: err.message });
             }
          }).catch(err => {
             console.error("[ERROR] Failed to update group cover:", err);
          });
        }}
        user={adminSession?.user}
        settings={adminSession?.settings}
        isRefreshing={adminSession?.isSyncing}
        onRefresh={() => adminSession?.onRefresh?.()}
      />

      {/* Admin Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-[#1D3557] px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300">
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 张照片吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              取消 / CANCEL
            </AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive"
              onClick={executeBatchDelete}
            >
              确认删除 / DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
