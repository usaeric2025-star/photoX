import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  X, Check, Search, Plus, Upload, Sparkles
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../ui/dialog';
import { Photo } from '../../types';
import { useInfinitePhotos, useTaskExecutor, useTasks } from '@/hooks';
import { useAdmin } from '@/features/admin/useAdmin';
import { PAGINATION } from '../../constants/config';
import { GroupGridView } from './GroupGridView';
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
  const { handlePhotoImport } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  const isRunning = tasks.some(t => t.status === 'running');

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // Use the global handler but pre-assign groupId
    if (handlePhotoImport) {
        await runTask('上传照片', async () => {
            await handlePhotoImport(e, true, groupId);
            onClose();
        }, { showSuccessToast: true });
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    
    await runTask('添加照片到群组', async () => {
      await onAdd(selectedIds);
      onClose();
      setSelectedIds([]);
    }, { showSuccessToast: true, silent: true });
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

        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="从现有库中搜索照片... / Search existing..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
          </div>

          <div className="flex shrink-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              onChange={onFileChange} 
              className="hidden" 
              accept="image/*"
            />
            <button 
              onClick={handleUploadClick}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 rounded-xl transition-all font-black text-xs uppercase tracking-tight disabled:opacity-50"
            >
              <Upload size={14} />
              <div className="flex flex-col items-start leading-none">
                <span>直接上传</span>
                <span className="text-[8px] opacity-60">Upload New</span>
              </div>
            </button>
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
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 flex-col gap-4">
              <p className="italic">现有库找不到符合条件的照片 / Library is empty</p>
              <button 
                onClick={handleUploadClick}
                disabled={isRunning}
                className="flex items-center gap-2 px-8 py-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all font-black disabled:opacity-50"
              >
                <Plus size={24} />
                还是直接从电脑上传吧 / Upload from computer
              </button>
            </div>
          ) : (
            <GroupGridView 
              photos={photos}
              onPhotoClick={handleToggleSelect}
              getPhotoProps={(photo) => ({
                className: cn(
                  "cursor-pointer transition-all border-4 rounded-[1.5rem]",
                  selectedIds.includes(photo.id) 
                    ? "border-emerald-500 scale-95 shadow-lg shadow-emerald-500/20" 
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
            {selectedIds.length > 0 ? `已选择 ${selectedIds.length} 张现有照片` : '选择或直接上传新照片'}
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
              disabled={selectedIds.length === 0 || isRunning}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2",
                selectedIds.length > 0 && !isRunning
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-emerald-500/20" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              )}
            >
              <Check size={18} />
              确认添加库中照片 / CONFIRM SELECTION
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

