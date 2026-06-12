import React from 'react';
import { Grid } from 'lucide-react';
import { translations } from '@/locales';

interface LightboxFloatingInfoProps {
  displayName: string;
  categoryName: string;
  tags: string[];
  isGroup: boolean;
  appLang: string;
}

export function LightboxFloatingInfo({
  displayName,
  categoryName,
  tags,
  isGroup,
  appLang
}: LightboxFloatingInfoProps) {
  const l = translations[appLang as keyof typeof translations] || translations.zh;

  return (
    <div className="absolute bottom-[10px] left-4 md:bottom-[12px] md:left-6 z-[var(--z-dropdown)] pointer-events-none flex flex-col items-start justify-end max-w-[70%] md:max-w-[60%] select-none">
      {displayName && (
        <h2 className="text-white text-lg md:text-xl font-bold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] mb-2 line-clamp-2">
          {isGroup && <span className="opacity-70 mr-2 text-[0.8em]">[{l.groupDetails}]</span>}
          {displayName}
        </h2>
      )}

      {(categoryName || tags.length > 0) && (
        <div className="flex flex-wrap gap-2 drop-shadow-lg">
          {categoryName && (
            <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-slate-900 bg-white px-2.5 py-1.5 rounded-lg shadow-xl ring-1 ring-black/5">
              <Grid size={10} className="text-brand-navy" /> {categoryName}
            </span>
          )}
          {tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="flex items-center gap-0.5 text-[10px] md:text-xs font-bold text-white bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 shadow-xl">
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] md:text-xs font-bold text-white/90 bg-slate-800/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
