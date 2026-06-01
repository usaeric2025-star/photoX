import React from 'react';
import { 
  RefreshCw, User as UserIcon, LogOut, Settings, 
  LayoutGrid, Trash2, Brain, Edit3, EyeOff, X 
} from 'lucide-react';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useGalleryStore, useShallow, useSettings, useMultiSelect } from '@/hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { logoutPublic } from '@/lib/publicAuth';
import { cn } from '@/lib/utils';

interface AdminHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  totalCount?: number;
  onBatchAiIdentify?: () => void;
}

export function AdminHeader({
  onRefresh,
  isRefreshing,
  totalCount,
  onBatchAiIdentify
}: AdminHeaderProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedIds, disable } = useMultiSelect();
  const { deletePhoto, batchUpdate } = useAdminActions();
  
  const { setActiveScreen, setViewMode, setBatchEditingIds } = useGalleryStore(useShallow(s => ({
    setActiveScreen: s.setActiveScreen,
    setViewMode: s.setViewMode,
    setBatchEditingIds: s.setBatchEditingIds
  })));

  const isSelectionMode = selectedIds.length > 0;

  const handleBackToShowcase = () => {
    setViewMode('public');
    setActiveScreen('gallery');
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} photos?`)) {
      await deletePhoto(selectedIds);
      disable();
    }
  };

  const handleBatchHide = async () => {
    await batchUpdate.mutateAsync({ ids: selectedIds, updates: { is_hidden: true } });
    disable();
  };

  if (isSelectionMode) {
    return (
      <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-blue-600 border-blue-700 text-white z-30 font-sans overflow-hidden transition-colors">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={disable}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors shrink-0"
            title="Cancel selection"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col">
            <span className="font-black text-sm sm:text-lg leading-none tracking-tight">{selectedIds.length} SELECTED</span>
            <span className="text-[9px] sm:text-[10px] font-bold opacity-70 uppercase tracking-widest hidden sm:block">Batch Actions Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {onBatchAiIdentify && (
            <button 
              onClick={onBatchAiIdentify}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 h-8 sm:h-10 rounded-full bg-white text-blue-600 hover:bg-blue-50 transition-all font-bold text-[10px] sm:text-xs shadow-sm active:scale-95"
            >
              <Brain size={16} />
              <span className="hidden sm:inline">AI IDENTIFY</span>
            </button>
          )}

          <button 
            onClick={() => setBatchEditingIds(selectedIds)}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all shrink-0"
            title="Edit Details"
          >
            <Edit3 size={18} />
          </button>

          <button 
            onClick={handleBatchHide}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all shrink-0"
            title="Hide Photos"
          >
            <EyeOff size={18} />
          </button>

          <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block" />

          <button 
            onClick={handleBatchDelete}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-red-500/80 hover:text-white rounded-full transition-all shrink-0 active:scale-95"
            title="Delete Selection"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-white border-slate-200 z-30 font-sans overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter whitespace-nowrap shrink-0 flex items-center">
          {settings?.logo_url ? (
            <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
          ) : (
            <span>PHOT<span className="text-blue-600">O</span>X</span>
          )}
          <span className="ml-2 text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-red-100">Admin</span>
        </h1>
        {totalCount !== undefined && (
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] sm:text-[10px] font-bold whitespace-nowrap shrink-0">
            {totalCount} PHOTOS
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        <LanguageSwitcher variant="full-management" />

        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-50 shrink-0"
            title="刷新数据"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        <button 
          onClick={handleBackToShowcase}
          className="flex items-center gap-2 px-3 h-9 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-all active:scale-95 shrink-0"
          title="返回照片展厅"
        >
          <LayoutGrid size={16} />
          <span className="text-xs font-bold hidden sm:inline">照片展厅</span>
        </button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 transition-all cursor-pointer shrink-0 outline-none">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden shrink-0">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={14} className="text-white" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 bg-white shadow-xl border border-slate-200 z-50">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Admin Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
              <DropdownMenuItem 
                onClick={() => setActiveScreen('settings')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <Settings size={16} />
                <span className="text-sm font-semibold">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => logoutPublic()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer transition-colors mt-1"
              >
                <LogOut size={16} />
                <span className="text-sm font-semibold">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
