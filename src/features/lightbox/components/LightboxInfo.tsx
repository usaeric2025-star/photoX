import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'lite-sleek';
import { Icon } from '#src/components/ui/Icon.js';
import { usePhotoAIResult } from '#src/hooks/photo/usePhotoAIResult.js';

interface LightboxInfoProps {
  currentPhoto: any;
  showInfo: boolean;
  lang: 'zh' | 'en' | 'ms';
  onLangChange: (lang: 'zh' | 'en' | 'ms') => void;
}

const formatPhotoDate = (dateStr: string) => {
  if (!dateStr) return 'Unknown Date';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
};

const getDisplayString = (val: any, lang: string) => {
  if (!val) return '';
  if (typeof val === 'string') {
    try {
      if (val.startsWith('{') && val.endsWith('}')) {
        const parsed = JSON.parse(val);
        return parsed[lang] || parsed.zh || parsed.en || val;
      }
    } catch(e) {}
    return val;
  }
  if (typeof val === 'object') {
    return val[lang] || val.zh || val.en || '';
  }
  return String(val);
};

export function LightboxInfo({
  currentPhoto,
  showInfo,
  lang,
  onLangChange
}: LightboxInfoProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  
  const photoData = (currentPhoto.original || currentPhoto) as any;
  const descriptionObj = photoData?.description;
  const displayDescription = getDisplayString(descriptionObj, lang);
  
  const rawTitle = (currentPhoto as any).title || photoData.name || 'Photo';
  const title = getDisplayString(rawTitle, lang);
  const uuid = photoData.id || 'N/A';

  const { data: aiResult, isLoading: aiLoading } = usePhotoAIResult(photoData.id);

  return (
    <AnimatePresence>
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition="fast"
          className="absolute top-24 sm:top-28 right-4 sm:right-6 w-[280px] sm:w-[320px] max-h-[calc(100vh-200px)] overflow-y-auto rounded-3xl bg-black/80 border border-white/10 shadow-2xl p-5 sm:p-6 z-[160] no-scrollbar pointer-events-auto"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium text-base sm:text-lg leading-snug mb-2">{title}</h3>
              <div className="flex items-center gap-4 text-[10px] sm:text-xs font-mono text-white/40 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Icon name="calendar" className="w-3 h-3" />{formatPhotoDate(photoData.createdAt)}</span>
              </div>
            </div>
            
            {displayDescription && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black tracking-widest uppercase">
                    <Icon name="file-text" className="w-3 h-3" />
                    <span>Story</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                    {(['zh', 'en', 'ms'] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => onLangChange(l)}
                        className={`px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase transition-all ${lang === l ? 'bg-white text-black' : 'text-white/40 active:text-white'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-white/80 leading-relaxed font-sans font-light">
                  {displayDescription}
                </div>
              </div>
            )}

            {/* AI RAW Section */}
            {(aiResult || aiLoading) && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black tracking-widest uppercase">
                    <Icon name="cpu" className="w-3 h-3" />
                    <span>AI Analysis</span>
                  </div>
                  <button 
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[10px] text-white/60 hover:text-white transition-colors flex items-center gap-1"
                  >
                    {showRaw ? 'Hide Raw' : 'Show Raw'}
                    <Icon name={showRaw ? 'chevron-up' : 'chevron-down'} className="w-3 h-3" />
                  </button>
                </div>
                
                {aiLoading ? (
                  <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
                ) : (
                  showRaw && (
                    <div className="bg-black/40 rounded-xl p-3 border border-white/5 max-h-60 overflow-y-auto scrollbar-thin">
                      <pre className="text-[9px] font-mono text-emerald-400/80 whitespace-pre-wrap break-all leading-tight">
                        {aiResult?.rawResult || 'No raw data available'}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="pt-4 border-t border-white/10 flex flex-col gap-2 text-[10px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-white/30 uppercase tracking-widest">ID</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(uuid);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors cursor-pointer group"
                  title="Copy ID"
                >
                  <span>{uuid.substring(0, 4)}</span>
                  {copied ? (
                    <Icon name="check" className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Icon name="copy" className="w-3 h-3 transition-colors group-active:scale-90" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
