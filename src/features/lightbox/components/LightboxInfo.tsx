import { useState } from 'react';
import { AnimatePresence, motion } from 'lite-sleek';
import { Icon } from '#src/components/ui/Icon.js';
import { usePhotoAIResult } from '#src/hooks/photo/usePhotoAI.js';
import { usePermission } from '#src/hooks/core/auth/usePermission.js';
import { Photo } from '#src/types/photo.js';
import { getLocalizedDisplay, translateDimensionLabelToEnglish } from '#src/utils/display.js';

interface LightboxInfoProps {
  currentPhoto: Photo | { original: Photo };
  showInfo: boolean;
  lang: 'zh' | 'en' | 'ms';
  onLangChange: (lang: 'zh' | 'en' | 'ms') => void;
}

export function LightboxInfo({
  currentPhoto,
  showInfo,
  lang,
  onLangChange
}: LightboxInfoProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  
  const photoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const descriptionObj = photoData?.description;
  const displayDescription = getLocalizedDisplay(descriptionObj, lang);
  
  const title = getLocalizedDisplay(photoData.name || '照片', lang);
  const uuid = photoData.id || 'N/A';
  const categoryName = photoData.categoryName || '无分类';
  const tags = photoData.tags || [];

  const { isStaff } = usePermission();
  const { data: aiResult, isLoading: aiLoading } = usePhotoAIResult(photoData.id, { 
    enabled: showInfo && isStaff 
  });

  const isAiIdentified = !!(photoData.metadata && (photoData.metadata as Record<string, unknown>).ai_raw) || !!photoData.isAnalyzing;

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
              <div className="flex flex-wrap gap-2 text-[10px] text-white/50">
                  <span className="bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {categoryName}
                    {isAiIdentified && (
                      <span className="text-[8px] font-bold text-purple-400">AI</span>
                    )}
                  </span>
                  {tags.map(tag => (
                      <span key={tag.id} className="bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                        #{tag.name}
                        {isAiIdentified && (
                          <span className="text-[8px] font-bold text-purple-400">AI</span>
                        )}
                      </span>
                  ))}
              </div>
            </div>
            
            {displayDescription && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-black tracking-widest uppercase">
                    <Icon name="file-text" className="w-3 h-3" />
                    <span>Story</span>
                    {isAiIdentified && (
                      <span className="bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded text-[8px] font-bold tracking-wider uppercase border border-purple-500/30">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                    {(['zh', 'en', 'ms'] as const).map(l => {
                      const hasText = !!(descriptionObj && (typeof descriptionObj === 'object') && (descriptionObj as Record<string, string>)[l]);
                      // If it's the current language, or it has text, or it's zh (which might be the fallback string)
                      const isAvailable = hasText || (l === 'zh' && typeof descriptionObj === 'string') || lang === l;
                      
                      return (
                        <button
                          key={l}
                          type="button"
                          disabled={!isAvailable && lang !== l}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onLangChange(l);
                          }}
                          className={`px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase transition-all ${lang === l ? 'bg-white text-black' : isAvailable ? 'text-white/60 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                        >
                          {l === 'zh' ? '中' : l === 'en' ? 'EN' : 'MS'}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-sm text-white/80 leading-relaxed font-sans font-light">
                  {displayDescription}
                </div>
              </div>
            )}

            {/* Dimensions Section */}
            {photoData.dimensions && photoData.dimensions.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-black tracking-widest uppercase">
                  <Icon name="ruler" className="w-3.5 h-3.5" />
                  <span>Dimensions</span>
                  {photoData.dimensions.some(d => d.isAi || d.isAiEstimated || isAiIdentified) && (
                    <span className="bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded text-[8px] font-bold tracking-wider uppercase border border-purple-500/30">
                      AI
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {photoData.dimensions.map((dim, i) => {
                    const rawLabel = dim.label || '';
                    const label = translateDimensionLabelToEnglish(rawLabel);
                    
                    const h = dim.height ? `H${dim.height}` : '';
                    const w = dim.width ? `W${dim.width}` : '';
                    const l = dim.length ? `L${dim.length}` : '';
                    const dimStr = [h, w, l].filter(Boolean).join(' x ');
                    const isAi = !!(dim.isAi || dim.isAiEstimated || isAiIdentified);

                    return (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/75 font-light">{label}</span>
                          {isAi && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[8px] font-bold tracking-wider uppercase border border-purple-500/30">
                              AI
                            </span>
                          )}
                        </div>
                        <span className="text-white/95 font-mono font-medium">{dimStr} {dim.unit || 'cm'}</span>
                      </div>
                    );
                  })}
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
