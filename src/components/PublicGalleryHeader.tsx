import React from 'react';
import { RefreshCcw, Grid3X3, Plus, Globe, Settings2, Sparkles } from 'lucide-react';
import { Photo, AppSettings } from '../types';
import { useNavigate } from 'react-router-dom';
import { LanguageCode } from '../lib/translations';
import { filterPhotosByMode } from '../utils/photoVisibility';


interface PublicGalleryHeaderProps {
  settings: AppSettings;
  photos: Photo[];
  isAdminMode: boolean;
  isRefreshing: boolean;
  isMultiSelect: boolean;
  lang: string;
  t: Record<string, any>;
  onHeaderClick: () => void;
  onRefresh: () => void;
  onAddPhoto: () => void;
  onSetLang: (lang: LanguageCode) => void;
  onExit?: () => void;
  onLogin?: () => void;
  onOpenSettings?: () => void;
  totalCount?: number;
}

export const PublicGalleryHeader: React.FC<PublicGalleryHeaderProps> = ({
  settings, photos, isRefreshing, lang, t,
  onHeaderClick, onRefresh, onAddPhoto, onSetLang, onExit, onLogin, onOpenSettings, totalCount
}) => {
  return (
    <header className="shrink-0 z-50 bg-brand-bg px-3 sm:px-4 py-1 flex items-center justify-between gap-1 sm:gap-4 border-b border-brand-navy/5">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0" onClick={onHeaderClick}>
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="h-10 sm:h-14 max-w-[150px] sm:max-w-[220px] object-contain rounded-xl border border-brand-navy/10 p-1 bg-white shadow-sm" />
        ) : (
          <div className="shrink-0">
            <h1 className="text-sm sm:text-lg font-black tracking-tighter text-brand-navy italic leading-none">GALLERY</h1>
          </div>
        )}
        
        <div className="flex items-center gap-1 bg-brand-navy/5 px-2 py-0.5 rounded-full border border-brand-navy/10 shrink-0 cursor-pointer" onClick={onRefresh}>
          <span className="text-[8px] sm:text-[9px] font-black text-brand-navy/60 italic flex items-center gap-1 lowercase">
            {totalCount !== undefined && totalCount !== null ? (
               t.gallerySub(totalCount)
            ) : (
              <>
                <div className="w-2 h-2 border border-brand-navy/20 border-t-brand-navy rounded-full animate-spin shrink-0" />
                {t.gallerySub(photos.length)}
              </>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
            {[
              { code: 'zh', label: '中文' },
              { code: 'en', label: 'EN' },
              { code: 'ms', label: 'BM' }
            ].map(l => (
              <button key={l.code} onClick={() => onSetLang(l.code as LanguageCode)} className={`${lang === l.code ? 'bg-brand-navy text-brand-bg' : 'bg-brand-navy/5 text-brand-navy/40'} px-2 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95`}>
                {l.label}
              </button>
            ))}
          </div>
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${isRefreshing ? 'bg-blue-600 text-white animate-spin ring-4 ring-blue-100' : 'bg-brand-navy/5 text-brand-navy hover:bg-brand-navy/10 active:scale-90'}`}
          >
            <RefreshCcw size={18} />
          </button>
          <button
             onClick={onExit}
             className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition-all ml-1 text-blue-600"
             title={t.login}
          >
            <div className="flex items-center justify-center relative">
              <Globe size={18} className="opacity-40" />
              <Plus size={10} className="absolute -top-1 -right-1 text-blue-600 stroke-[3px]" />
            </div>
          </button>
      </div>
    </header>
  );
};
