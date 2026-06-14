import React from 'react';
import { Grid } from 'lucide-react';
import { translations } from '@/locales';

interface LightboxFloatingInfoProps {
  displayName: string;
  categoryName: string;
  tags: string[];
  isGroup: boolean;
  appLang: string;
  hasActions?: boolean;
}

export function LightboxFloatingInfo({
  displayName,
  categoryName,
  tags,
  isGroup,
  appLang,
  hasActions
}: LightboxFloatingInfoProps) {
  const l = translations[appLang as keyof typeof translations] || translations.zh;

  return (
    <div className={`fixed top-6 left-6 z-40 pointer-events-none flex flex-col items-start max-w-[85%] md:max-w-[40%] select-none animate-in fade-in slide-in-from-top-2 duration-700`}>
      <div className="bg-black/20 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/10 shadow-2xl max-w-[300px]">
        {displayName && (
          <h2 className="text-white text-sm font-bold tracking-tight mb-2 line-clamp-1 font-sans drop-shadow-xl opacity-95">
            {displayName}
          </h2>
        )}

        {(categoryName || tags.length > 0) && (
          <div className="flex flex-col gap-1.5">
            {categoryName && (
              <span className="w-fit px-2 py-0.5 bg-white/10 rounded-md text-white/90 text-[10px] font-bold uppercase tracking-wider border border-white/5 backdrop-blur-xl">
                {categoryName}
              </span>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white/5 rounded-md text-white/60 text-[9px] font-medium uppercase tracking-wider border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
