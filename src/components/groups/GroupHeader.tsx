import React from 'react';
import { 
  ChevronLeft, Pencil, Sparkles, Settings2, MoreVertical, Plus, X 
} from 'lucide-react';
import { Photo, ProductGroup } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useGalleryStore } from '../../store';

interface GroupHeaderProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  isAdminMode: boolean;
  groupData: ProductGroup | null;
  isGroupDataLoading: boolean;
  activeGroupPhotos: Photo[];
  onAddPhotoToGroup?: () => void;
  selectedPhotoIds: string[];
  setIsMultiSelectMode: (mode: boolean) => void;
  setSelectedPhotoIds: (ids: string[]) => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  activeGroupId,
  setActiveGroupId,
  isAdminMode,
  groupData,
  isGroupDataLoading,
  activeGroupPhotos,
  onAddPhotoToGroup,
  selectedPhotoIds,
  setIsMultiSelectMode,
  setSelectedPhotoIds
}) => {
  const { setGroupSettingsOpen, setBatchEditingIds, setBatchAiAnalyzeTrigger } = useGalleryStore();
  
  return (
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
              setGroupSettingsOpen(true);
            }
          }}
        >
          <div className="flex items-center gap-2 min-h-[1.5rem]">
            {isGroupDataLoading ? (
              <Skeleton className="h-6 w-32 bg-slate-200" />
            ) : (
              <>
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                  {groupData?.name || activeGroupPhotos[0]?.name || `GROUP ${activeGroupId?.slice(-4)}`}
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
                onClick={() => setBatchAiAnalyzeTrigger(true)}
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
                      const ids = selectedPhotoIds.length > 0 ? selectedPhotoIds : activeGroupPhotos.map(p => p.id);
                      setBatchEditingIds(ids);
                      setIsMultiSelectMode(false);
                      setSelectedPhotoIds([]);
                    }}
                    className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-slate-50 focus:bg-slate-50 outline-none"
                  >
                    <Pencil size={16} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-700">批量编辑 / Batch Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setBatchAiAnalyzeTrigger(true)}
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
