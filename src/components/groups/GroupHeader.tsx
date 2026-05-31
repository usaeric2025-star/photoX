import React from 'react';
import { 
  ChevronLeft, Pencil, Sparkles, Settings2, MoreVertical, X, Plus 
} from 'lucide-react';
import { Photo, ProductGroup } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

interface GroupHeaderProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  isAdminMode: boolean;
  groupData: ProductGroup | null;
  isGroupDataLoading: boolean;
  activeGroupPhotos: Photo[];
  onBatchAiAnalyzeByGroupId?: (groupId: string) => Promise<void | null>;
}

export function GroupHeader({
  activeGroupId,
  setActiveGroupId,
  isAdminMode,
  groupData,
  isGroupDataLoading,
  activeGroupPhotos,
  onBatchAiAnalyzeByGroupId,
}: GroupHeaderProps) {
  const { setGroupSettingsOpen, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, setIsPhotoPickerOpen, setPhotoPickerGroupId, setBatchEditingIds } = useGalleryStore(useShallow(s => ({
    setGroupSettingsOpen: s.setGroupSettingsOpen,
    isMultiSelect: s.isMultiSelect,
    setIsMultiSelect: s.setIsMultiSelect,
    selectedIds: s.selectedIds,
    setSelectedIds: s.setSelectedIds,
    setIsPhotoPickerOpen: s.setIsPhotoPickerOpen,
    setPhotoPickerGroupId: s.setPhotoPickerGroupId,
    setBatchEditingIds: s.setBatchEditingIds
  })));
  
  const onBatchAiAnalyze = (photos: Photo[]) => {};
  const onBatchEdit = (ids: string[]) => setBatchEditingIds(ids);
  
  return (
    <div className="flex-shrink-0 sticky top-0 bg-brand-bg/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
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
              setGroupSettingsOpen(true);
            }
          }}
        >
          <div className="flex items-center gap-2 min-h-[1.75rem]">
            {isGroupDataLoading ? (
              <Skeleton className="h-6 w-32 bg-slate-200 animate-pulse" />
            ) : (
              <>
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                  {/* [FIELD-LEVEL-FALLBACK] Render group name, first photo name, or ID as last resort */}
                  {groupData?.name || activeGroupPhotos[0]?.name || activeGroupPhotos[0]?.item_code || `GROUP ${activeGroupId?.slice(-4)}`}
                </h2>
                {isAdminMode && <Pencil size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </>
            )}
          </div>
          <div className="min-h-[1rem]">
            {isGroupDataLoading ? (
              <Skeleton className="h-3 w-40 mt-1 bg-slate-100 animate-pulse" />
            ) : (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
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
                  if (activeGroupId) {
                    setPhotoPickerGroupId(activeGroupId);
                    setIsPhotoPickerOpen(true);
                  }
                }}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm active:scale-95 transition-all"
                title="添加照片 / Add Photos"
              >
                <Plus size={20} />
              </button>

              <button 
                onClick={() => {
                  if (selectedIds.length > 0 && onBatchAiAnalyze) {
                    onBatchAiAnalyze(activeGroupPhotos.filter(p => selectedIds.includes(p.id)));
                  } else if (onBatchAiAnalyzeByGroupId && activeGroupId) {
                    onBatchAiAnalyzeByGroupId(activeGroupId);
                  } else if (onBatchAiAnalyze) {
                    onBatchAiAnalyze(activeGroupPhotos);
                  }
                }}
                className="hidden sm:flex px-3 h-10 items-center justify-center border border-[#7A00E6]/20 rounded-xl bg-[#F3E8FF] text-[#7A00E6] font-bold shadow-sm active:scale-95 transition-all gap-1.5"
                title="AI 整組處理"
              >
                <Sparkles size={16} />
                <span className="text-xs">AI</span>
              </button>

                <button onClick={() => setGroupSettingsOpen(true)} className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-indigo-200 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all" title="群组数据库">
                  <Settings2 size={18} />
                </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm active:scale-95 transition-all">
                  <MoreVertical size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[200]">
                  <DropdownMenuItem 
                    onClick={() => {
                      const ids = selectedIds.length > 0 ? selectedIds : activeGroupPhotos.map(p => p.id);
                      if (onBatchEdit) onBatchEdit(ids);
                      setIsMultiSelect(false);
                      setSelectedIds([]);
                    }}
                    className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                  >
                    <Pencil size={16} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-700">批量编辑 / Batch Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (selectedIds.length > 0 && onBatchAiAnalyze) {
                          onBatchAiAnalyze(activeGroupPhotos.filter(p => selectedIds.includes(p.id)));
                      } else if (onBatchAiAnalyzeByGroupId && activeGroupId) {
                          onBatchAiAnalyzeByGroupId(activeGroupId);
                      } else if (onBatchAiAnalyze) {
                          onBatchAiAnalyze(activeGroupPhotos);
                      }
                    }}
                    className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                  >
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="text-sm font-bold text-slate-700">AI 識別 / AI Identify</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>


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
  );
};
