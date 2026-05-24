import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useGalleryStore } from '../../store';

export const LanguageSwitcher: React.FC<{ variant?: 'admin' | 'public' | 'ghost' }> = ({ variant = 'admin' }) => {
  const appLang = useGalleryStore(s => s.appLang);
  const setAppLang = useGalleryStore(s => s.setAppLang);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const langs = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'ms', label: 'Melayu' }
  ];

  const getButtonClass = () => {
    if (variant === 'public') {
      return "h-9 px-2.5 flex items-center gap-1.5 rounded-full border border-[#ECECEC] bg-white text-[#555555] shadow-none hover:bg-[#F1F3F4] transition-all";
    }
    if (variant === 'ghost') {
      return "h-9 w-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-brand-navy/60 hover:text-brand-navy bg-white border border-brand-navy/10 shadow-sm transition-all";
    }
    return "h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-2 rounded-xl text-brand-navy/60 hover:text-brand-navy bg-white border border-brand-navy/10 shadow-sm transition-all";
  };

  if (variant === 'public') {
    return (
      <div className="flex items-center bg-[#F7F7F7] p-0.5 rounded-full border border-[#ECECEC] h-9">
        {[
          { code: 'zh', label: '中文' },
          { code: 'en', label: 'EN' },
          { code: 'ms', label: 'BM' }
        ].map(l => (
          <button 
            key={l.code} 
            onClick={() => setAppLang(l.code as any)} 
            className={`px-3 h-8 flex items-center justify-center rounded-full text-[12px] font-bold transition-all ${appLang === l.code ? 'bg-[#1A1C3E] text-white shadow-sm' : 'text-[#888888] hover:text-[#1A1A1A]'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  const currentDisplay = langs.find(l => l.code === appLang)?.label || '中文';

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={getButtonClass()}
      >
        <Globe size={18} />
        {variant !== 'ghost' && <span className="text-[10px] font-bold tracking-tight hidden sm:inline">{currentDisplay}</span>}
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-brand-navy/10 py-2 w-32 z-50">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => {
                setAppLang(l.code as any);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 transition-colors flex items-center justify-between ${appLang === l.code ? 'text-white font-bold bg-[#1A1C3E]' : 'text-slate-600 font-medium hover:bg-slate-50'}`}
            >
              <span className="text-sm">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
