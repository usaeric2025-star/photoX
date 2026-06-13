import { showToast } from '@/lib/ui/toast';
import { useUIStore } from '@/store/useUIStore';
import React, { useState, useCallback, useRef } from "react";
import { X, Check, Search, Plus, Upload, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Photo } from "../../types";
import { usePhotos, useTaskExecutor, useTasks, useInvalidatePhotos } from "@/hooks";
import { PAGINATION } from "../../constants/config";
import { GroupGridView } from "./GroupGridView";
import { cn } from "@/lib/utils";
import { savePhotosToCloudBatch } from "@/services/photo/upload";
import { useAuth } from "@/hooks/core/auth/useAuth";
import { processImageFiles } from '@/services/storage/imageProcessor';
import { checkDuplicateBatch, removeFromDuplicateCache } from '@/services/photo/duplicateCheck';

interface GroupPhotoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onAdd: (photoIds: string[]) => Promise<void>;
}

export function GroupPhotoPicker({
  isOpen,
  onClose,
  groupId,
  onAdd,
}: GroupPhotoPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { user } = useAuth();
  const invalidatePhotos = useInvalidatePhotos();

  const handlePhotoImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isGallery: boolean,
    targetGroupId?: string,
  ) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    // Simple photo conversion for batch upload
    const files = Array.from(e.target.files);
    
    const { newFiles: uniqueFiles, duplicateHashes: duplicateFiles } = checkDuplicateBatch(files);

    if (duplicateFiles.length > 0) {
      showToast.warning(`已重新检查并跳过 ${duplicateFiles.length} 张重复照片`);
    }

    if (uniqueFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      await runTask(`上传 ${uniqueFiles.length} 张照片`, async ({ updateProgress }) => {
        let completed = 0;
        
        const processedImages = await processImageFiles(uniqueFiles, (count, total) => {
           updateProgress(Math.round((count / total) * 30), `正在准备照片 (${count}/${total})`);
        });

        const photoData: Photo[] = processedImages.map((result) => ({
           id: `temp-${crypto.randomUUID()}`,
           uri: result.dataUrl,
           image_hash: result.hash,
           thumb_hash: result.thumbHash,
           name: result.file.name,
           group_id: targetGroupId,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           dimensions: { width: 0, height: 0 },
           is_hidden: false,
           _fileSize: result.file.size,
           _fileName: result.file.name,
           _lastModified: result.file.lastModified
        } as unknown as Photo));

        const savedPhotos = await savePhotosToCloudBatch(user.id, photoData, (count) => {
          completed = count;
          const pct = 30 + Math.round((completed / uniqueFiles.length) * 70);
          updateProgress(pct, `正在保存照片 (${count}/${uniqueFiles.length})`);
        });
        
        const skippedCloud = photoData.length - savedPhotos.length;
        if (skippedCloud > 0) {
          showToast.success(`成功上传 ${savedPhotos.length} 张，云端排重跳过 ${skippedCloud} 张`);
        } else {
          showToast.success(`上传成功 (${savedPhotos.length} 张)`);
        }
        return savedPhotos;
      }, {
        showSuccessToast: false,
        showErrorToast: true
      });
    } catch (e) {
      const { removeFromDuplicateCache } = await import('@/services/photo/duplicateCheck');
      uniqueFiles.forEach(file => removeFromDuplicateCache(file));
      throw e;
    }

    invalidatePhotos();
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  const isRunning = tasks.some((t) => t.status === "running");

  const queryParams = { searchQuery: search, isAdminMode: true, onlyUngrouped: true };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    usePhotos({ ...queryParams, limit: PAGINATION.ADMIN_BATCH_SIZE });

  const photos = data?.pages.flatMap((p: any) => p.photos) || [];

  const handleToggleSelect = (photo: Photo) => { setSelectedIds((prev) => prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]); };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      await handlePhotoImport(e, true, groupId);
      onClose();
    } catch (e) {
      // Error handled inside handlePhotoImport or by TaskExecutor
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;

    await runTask(
      "添加照片到群组",
      async () => {
        await onAdd(selectedIds);
        onClose();
        setSelectedIds([]);
      },
      { showSuccessToast: true, silent: true },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
            添加照片到群组 / ADD PHOTOS
          </DialogTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </DialogHeader>

        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
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

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  加载中 / Loading
                </p>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 flex-col gap-4">
              <p className="italic">
                现有库找不到符合条件的照片 / Library is empty
              </p>
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
                    : "border-transparent",
                ),
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
            {selectedIds.length > 0
              ? `已选择 ${selectedIds.length} 张现有照片`
              : "选择或直接上传新照片"}
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
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none",
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
}
