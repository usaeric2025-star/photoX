import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, Check, Search, Plus
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../ui/dialog';
import { Photo } from '../../types';
import { useInfinitePhotos, useFeedback, useTaskExecutor } from '@/hooks';
import { PAGINATION } from '../../constants/config';
import { GroupGridView } from './GroupGridView';
import { useGalleryStore, useShallow } from '@/store';
import { cn } from '@/lib/utils';

interface GroupPhotoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onAdd: (photoIds: string[]) => Promise<void>;
}

export const GroupPhotoPicker: React.FC<GroupPhotoPickerProps> = ({
  isOpen,
  onClose,
  groupId,
  onAdd
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { runTask } = useTaskExecutor();
  const { showError } = useFeedback();

  // We want to fetch photos that are NOT in a group
  // The current useInfinitePhotos might not support group_id filtering easily if it's not implemented in the service
  // But usually we can filter them locally or the service supports it.
  // Let's assume we fetch all and filter locally for now, or just show all and let them pick.
  // Better: implementation in photoService typically allows filtering by group_id: null
  
  const queryParams = useMemo(() => ({
    searchQuery: search,
    isAdminMode: true,
    onlyUngrouped: true
  }), [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfinitePhotos(queryParams, PAGINATION.ADMIN_BATCH_SIZE);

  const photos = useMemo(() => {
    return data?.pages.flatMap(p => p.photos) || [];
  }, [data]);

  const handleToggleSelect = useCallback((photo: Photo) => {
    setSelectedIds(prev => 
      prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
    );
  }, []);

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    
    await runTask('添加照片到群组', async () => {
      await onAdd(selectedIds);
      onClose();
      setSelectedIds([]);
    }, { showSuccessToast: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
            添加照片到群组 / ADD PHOTOS
          </DialogTitle>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </DialogHeader>

        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索照片编号或名称... / Search photos..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">加载中 / Loading</p>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <p>找不到符合条件的照片 / No photos found</p>
            </div>
          ) : (
            <GroupGridView 
              photos={photos}
              onPhotoClick={handleToggleSelect}
              getPhotoProps={(photo) => ({
                className: cn(
                  "cursor-pointer transition-all border-4 rounded-[1.5rem]",
                  selectedIds.includes(photo.id) 
                    ? "border-emerald-500 scale-95" 
                    : "border-transparent"
                )
              })}
              isLoading={isLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={fetchNextPage}
            />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between sm:justify-between">
          <div className="text-sm font-bold text-slate-500">
            已选择 {selectedIds.length} 张照片
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消 / Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2",
                selectedIds.length > 0 
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              )}
            >
              <Plus size={18} />
              确认添加 / CONFIRM
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
