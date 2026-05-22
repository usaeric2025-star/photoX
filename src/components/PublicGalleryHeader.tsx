import React from 'react';
import { RefreshCcw, Grid3X3, Plus, Globe, Settings2, Sparkles, LogIn } from 'lucide-react';
import { Photo, AppSettings } from '../types';
import { useNavigate } from 'react-router-dom';
import { LanguageCode } from '../lib/translations';
import { filterPhotosByMode } from '../utils/photoVisibility';


import { useSettings, useGalleryStore } from '../hooks';
import { translations } from '../lib/translations';

interface PublicGalleryHeaderProps {
  photos: Photo[];
  isAdminMode: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onAddPhoto: () => void;
  onExit?: () => void;
  onLogin?: () => void;
  onOpenSettings?: () => void;
  totalCount?: number;
}

export const PublicGalleryHeader: React.FC<PublicGalleryHeaderProps> = ({
  photos, isAdminMode, isRefreshing,
  onRefresh, onAddPhoto, onExit, onLogin, onOpenSettings, totalCount
}) => {
  const { settings } = useSettings();
  const lang = useGalleryStore(s => s.appLang);
  const t = translations[lang] || translations.zh;

  return (
    <header className="shrink-0 z-50 bg-white h-[58px] px-4 sm:px-6 flex items-center justify-between border-b border-[#ECECEC]">
      <div className="flex items-center gap-2.5 min-w-0" onClick={() => {}}>
        {settings?.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="h-8 w-auto object-contain transition-transform active:scale-95 cursor-pointer" 
          />
        ) : (
          <div className="shrink-0 cursor-pointer">
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-[#1A1A1A] italic leading-none">
              PHOT<span className="text-[#0051BA]">O</span>X
            </h1>
          </div>
        )}
        
        <div className="flex items-center bg-[#F1F3F4] px-2.5 py-1 rounded-full border border-[#ECECEC] shrink-0">
          <span className="text-[11px] font-bold text-[#5F6368] tracking-tight whitespace-nowrap">
            {totalCount !== undefined && totalCount !== null 
              ? `${totalCount} photos` 
              : `${photos?.length || 0} photos`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all border border-[#ECECEC] ${isRefreshing ? 'bg-[#0051BA] text-white animate-spin' : 'bg-[#F1F3F4] text-[#555555] active:scale-95'}`}
          >
            <RefreshCcw size={16} />
          </button>

          <button
             onClick={onLogin}
             className="w-9 h-9 bg-white border border-[#ECECEC] text-[#555555] rounded-full flex items-center justify-center hover:bg-[#F1F3F4] active:scale-95 transition-all shadow-none"
             title={t.login}
          >
            <div className="relative">
              <Globe size={16} />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#0051BA] rounded-full flex items-center justify-center border-2 border-white">
                <Plus size={5} className="text-white" />
              </div>
            </div>
          </button>
      </div>
    </header>
  );
};
