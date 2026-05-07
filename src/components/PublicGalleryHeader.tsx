import React from 'react';
import { RefreshCcw, Grid3X3, Plus, Globe, Settings2, Sparkles } from 'lucide-react';
import { Photo, AppSettings } from '../types';
import { useNavigate } from 'react-router-dom';
import { LanguageCode } from '../lib/translations';

interface PublicGalleryHeaderProps {
  onSecretTrigger?: () => void;
  settings: AppSettings;
  photos: Photo[];
  isAdminMode: boolean;
  isRefreshing: boolean;
  isMultiSelect: boolean;
  lang: string;
  t: Record<string, any>;
  onHeaderClick: () => void;
  onRefresh: () => void;
  onToggleMultiSelect: () => void;
  clearSelection: () => void;
  setIsMultiSelect: (val: boolean) => void;
  onAddPhoto: () => void;
  onSetLang: (lang: LanguageCode) => void;
  onExit?: () => void;
  onLogin?: () => void;
  onOpenSettings?: () => void;
  totalCount?: number;
}

export const PublicGalleryHeader: React.FC<PublicGalleryHeaderProps> = ({
  settings, photos, isAdminMode, isRefreshing, isMultiSelect, lang, t,
  onHeaderClick, onRefresh, onToggleMultiSelect, clearSelection, setIsMultiSelect, onAddPhoto, onSetLang, onExit, onOpenSettings, totalCount
}) => {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = React.useState(0);
  const clickTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 5) {
      setClickCount(0);
      if (onSecretTrigger) onSecretTrigger();
    } else {
      clickTimer.current = setTimeout(() => setClickCount(0), 1000);
    }
  };

  return (
    <header className="shrink-0 z-50 bg-[#FDFAF6] px-3 sm:px-4 py-1 flex items-center justify-between gap-1 sm:gap-4 border-b border-[#1D3557]/5">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0" onClick={handleLogoClick}>
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="h-10 sm:h-12 max-w-[150px] sm:max-w-[220px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm" />
        ) : (
          <div className="shrink-0">
            <h1 className="text-sm sm:text-lg font-black tracking-tighter text-[#1D3557] italic leading-none">GALLERY</h1>
          </div>
        )}
        
        <div className="flex items-center gap-1 bg-[#1D3557]/5 px-2 py-0.5 rounded-full border border-[#1D3557]/10 shrink-0 cursor-pointer" onClick={onRefresh}>
          <span className="text-[8px] sm:text-[9px] font-black text-[#1D3557]/60 italic">
            {t.gallerySub(totalCount !== undefined ? totalCount : photos.filter(p => !p.isHidden).length)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdminMode && (
            <div className="flex items-center gap-2 mr-2">
              <button 
                onClick={() => {
                  if (isMultiSelect) {
                    clearSelection();
                    setIsMultiSelect(false);
                  } else {
                    setIsMultiSelect(true);
                  }
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 border ${isMultiSelect ? 'bg-[#D4A853] border-[#D4A853] text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                title={t.selectMode}
              >
                <Grid3X3 size={20} />
              </button>
              <button 
                onClick={onAddPhoto}
                className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center transition-all shadow-lg hover:bg-blue-700 active:scale-95"
                title={t.addPhoto}
              >
                <Plus size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
            {[
              { code: 'zh', label: '中文' },
              { code: 'en', label: 'EN' },
              { code: 'ms', label: 'BM' }
            ].map(l => (
              <button key={l.code} onClick={() => onSetLang(l.code as LanguageCode)} className={`${lang === l.code ? 'bg-[#1D3557] text-[#FDFAF6]' : 'bg-[#1D3557]/5 text-[#1D3557]/40'} px-2 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95`}>
                {l.label}
              </button>
            ))}
          </div>
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-9 h-9 flex items-center justify-center rounded-xl bg-[#1D3557]/5 text-[#1D3557] hover:bg-[#1D3557]/10 transition-all shadow-sm ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-90'}`}
          >
            <RefreshCcw size={18} />
          </button>

          {isAdminMode ? (
            onExit && (
              <button 
                onClick={onExit}
                className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition-all ml-1"
                title="Globe"
              >
                <Globe size={18} />
              </button>
            )
          ) : (
            <button
               onClick={onExit}
               className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition-all ml-1 text-blue-600"
               title={t.login}
            >
              <Globe size={20} />
            </button>
          )}

          {isAdminMode && (
            <button 
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center transition-all shadow-sm hover:ring-2 hover:ring-blue-500 active:scale-95"
              title={t.settings}
            >
              <Settings2 size={18} />
            </button>
          )}
      </div>
    </header>
  );
};
