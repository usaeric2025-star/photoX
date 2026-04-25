import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon, Settings2, Share2, Layers, Trash2 } from 'lucide-react';
import { Photo } from '../../types';
import { PhotoCard } from '../PhotoCard';

interface ProductGridProps {
  displayMode: 'grid' | 'list';
  displayPhotos: Photo[];
  photos: Photo[];
  selectedIds: string[];
  showGroupsCollapsed: boolean;
  dbCategories: any[];
  appLang: string;
  categories: any[];
  isMultiSelect: boolean;
  togglePhotoSelection: (id: string) => void;
  setIsMultiSelect: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveGroupId: (id: string | null) => void;
  setPreviewUri: (uri: string | null) => void;
  setEditPhotoId: (id: string | null) => void;
  setAddCatId: (id: string | null) => void;
  setAddSubId: (id: string | null) => void;
  setAddTagIds: (ids: string[]) => void;
  setAddNote: (note: string) => void;
  setAddName: (name: string) => void;
  setAddManualCode: (code: string) => void;
  setAddDimL: (l: string) => void;
  setAddDimW: (w: string) => void;
  setAddDimH: (h: string) => void;
  setNewPhotoData: (data: string | null) => void;
  viewMode: 'public' | 'private';
  user: any;
  handleShare: () => void;
  handleGroupPhotos: () => void;
  deleteSelected: () => void;
  setBatchEditIds: (ids: string[] | null) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  displayMode,
  displayPhotos,
  photos,
  selectedIds,
  showGroupsCollapsed,
  dbCategories,
  appLang,
  categories,
  isMultiSelect,
  togglePhotoSelection,
  setIsMultiSelect,
  setSelectedIds,
  setActiveGroupId,
  setPreviewUri,
  setEditPhotoId,
  setAddCatId,
  setAddSubId,
  setAddTagIds,
  setAddNote,
  setAddName,
  setAddManualCode,
  setAddDimL,
  setAddDimW,
  setAddDimH,
  setNewPhotoData,
  viewMode,
  user,
  handleShare,
  handleGroupPhotos,
  deleteSelected,
  setBatchEditIds
}) => {
  return (
    <div className="px-6 py-2">
      <div className={`grid gap-3 ${displayMode === 'grid' ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {displayPhotos.map((photo) => {
          const groupPhotos = photo.groupId ? photos.filter((p) => p.groupId === photo.groupId) : [];
          const isGroupMaster = photo.groupId && showGroupsCollapsed;
          const groupCount = groupPhotos.length;
          const isGroupSelected = isGroupMaster ? groupPhotos.every((p) => selectedIds.includes(p.id)) : selectedIds.includes(photo.id);

          return (
            <PhotoCard 
              key={photo.id}
              photo={photo}
              isMultiSelect={isMultiSelect}
              isSelected={isGroupSelected}
              isGroupMaster={isGroupMaster}
              groupCount={groupCount}
              categoryName={(() => {
                const code = photo.category;
                const dbCat = dbCategories.find(c => c.code === code);
                if (dbCat) {
                  const name = dbCat[appLang] || dbCat.zh;
                  const isUncat = (n: string) => ['未分类', '未分類', 'uncategorized', 'others'].includes(n.toLowerCase());
                  return isUncat(name) ? undefined : name;
                }
                const legacyCat = categories.find(c => c.id === photo.categoryId);
                const legacyName = legacyCat?.name;
                const isUncategorized = (n: string) => 
                  ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(n.toLowerCase());
                
                if (legacyName && !isUncategorized(legacyName)) return legacyName;
                if (code && !isUncategorized(code)) return code;
                return undefined;
              })()}
              onClick={() => {
                if (isMultiSelect) {
                  if (isGroupMaster) {
                    const gIds = groupPhotos.map((p) => p.id);
                    if (isGroupSelected) {
                      const next = selectedIds.filter((id) => !gIds.includes(id));
                      setSelectedIds(next);
                      if (next.length === 0) setIsMultiSelect(false);
                    } else {
                      setSelectedIds((prev) => [...new Set([...prev, ...gIds])]);
                    }
                  } else {
                    togglePhotoSelection(photo.id);
                  }
                } else {
                  if (isGroupMaster) {
                    setActiveGroupId(photo.groupId!);
                  } else {
                    setPreviewUri(photo.uri);
                  }
                }
              }}
              onContextMenu={(e: React.MouseEvent) => {
                e.preventDefault();
                if (viewMode === 'public' || !user) return;
                setEditPhotoId(photo.id);
                setAddCatId(photo.categoryId);
                setAddSubId(photo.subcategoryId);
                setAddTagIds(photo.tagIds || []);
                setAddNote(photo.description || '');
                setAddName(photo.name || '');
                setAddManualCode(photo.manual_code || '');
                setAddDimL(photo.dimensions?.length?.toString() || '');
                setAddDimW(photo.dimensions?.width?.toString() || '');
                setAddDimH(photo.dimensions?.height?.toString() || '');
                setNewPhotoData(photo.uri);
              }}
            />
          );
        })}
      </div>
      
      {displayPhotos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white/50 shadow-sm">
            <ImageIcon size={32} className="opacity-40" />
          </div>
          <p className="text-xs font-medium">找不到符合条件的照片</p>
        </div>
      )}
      
      <AnimatePresence>
        {isMultiSelect && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-10 right-10 z-40 bg-white/80 backdrop-blur-xl rounded-[32px] p-4 flex flex-col gap-3 shadow-2xl border border-white/50"
          >
            <div className="flex justify-between items-center px-2">
              <span className={`text-xs font-bold transition-colors ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                {selectedIds.length > 0 ? `已選取 ${selectedIds.length} 張` : `選取照片`}
              </span>
              <button 
                onClick={() => { setIsMultiSelect(false); setSelectedIds([]); }}
                className="text-[10px] text-slate-400 font-medium hover:text-slate-600"
              >
                结束选择
              </button>
            </div>
            <div className="flex gap-4 items-center justify-center">
                <button 
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    setBatchEditIds(selectedIds);
                    setAddCatId(null);
                    setAddSubId(null);
                    setAddTagIds([]);
                  }}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-active:scale-90 transition-transform">
                     <Settings2 size={20} />
                   </div>
                   <span className="text-[9px] mt-1 text-indigo-600 font-bold">批量分類</span>
                </button>
                <button 
                  disabled={selectedIds.length === 0}
                  onClick={handleShare}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-active:scale-90 transition-transform">
                     <Share2 size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-blue-600 font-bold">分享</span>
                </button>

                <button 
                  disabled={selectedIds.length < 2}
                  onClick={handleGroupPhotos}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm group-active:scale-90 transition-transform">
                     <Layers size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-purple-600 font-bold">设为同组</span>
                </button>

                {selectedIds.length > 0 && (
                  <button 
                    onClick={deleteSelected}
                    className="flex flex-col items-center group text-red-500"
                  >
                     <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center shadow-sm group-active:scale-90 transition-transform">
                       <Trash2 size={18} />
                     </div>
                     <span className="text-[9px] mt-1 font-bold">删除</span>
                  </button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
