import React, { useState } from 'react';
import { AnimatePresence, motion } from 'lite-sleek';
import { Icon } from '#src/components/ui/Icon.js';
import { usePhoto, usePhotoAIResult, usePermission, useAdminMode, useTranslation } from '#src/hooks/index.js';
import { Photo } from '#src/types/photo.js';
import { getLocalizedDisplay, translateDimensionLabelToEnglish } from '#src/utils/display.js';
import { PLACEHOLDERS } from '#src/constants/config.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { feedback } from '#lib/feedback.js';

interface LightboxInfoProps {
  currentPhoto: Photo | { original: Photo };
  showInfo: boolean;
  lang: 'zh' | 'en' | 'ms';
  onLangChange: (lang: 'zh' | 'en' | 'ms') => void;
  onShowFeedback?: (msg: string, type?: 'success' | 'error') => void;
}

/**
 * LightboxInfo
 * 
 * 燈箱右側的信息面板，展示名稱、描述、分類、標籤及尺寸信息。
 */
export function LightboxInfo({
  currentPhoto,
  showInfo,
  lang,
  onLangChange,
  onShowFeedback
}: LightboxInfoProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  
  const basePhotoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const { data: fullPhotoData } = usePhoto(basePhotoData.id);
  const photoData = fullPhotoData || basePhotoData;
  const descriptionObj = photoData?.description;
  const displayDescription = getLocalizedDisplay(descriptionObj, lang);
  const title = getLocalizedDisplay(photoData.name || t('unnamedItem'), lang);
  const uuid = photoData.id || PLACEHOLDERS.EMPTY_VAL;
  
  const categoryName = photoData.categoryDescription?.[lang] || photoData.categoryName || t('uncategorized');
  const tags = photoData.tags || [];
  
  const { can } = usePermission();
  const isAdminMode = useAdminMode();
  
  const { data: aiResult, isLoading: aiLoading } = usePhotoAIResult(photoData.id, { 
    enabled: showInfo && isAdminMode && can('photo:view-internal-info') 
  });

  const isAiIdentified = !!(photoData.metadata && (photoData.metadata as Record<string, unknown>).ai_raw) || !!photoData.isAnalyzing;
  const isAdmin = isAdminMode && can('photo:view-internal-info');

  return (
    <AnimatePresence>
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition="fast"
          className="absolute top-24 sm:top-28 right-4 sm:right-6 w-[280px] sm:w-[320px] max-h-[calc(100vh-200px)] overflow-y-auto rounded-3xl bg-black/85 border border-white/10 shadow-2xl p-5 sm:p-6 z-[160] no-scrollbar pointer-events-auto "
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-white/30 text-[10px] font-black tracking-widest uppercase">
                    <Icon name="tag" className="w-3 h-3" />
                    <span>{t('productName')}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg sm:text-xl leading-tight tracking-tight">
                    {title}
                  </h3>
                </div>
                {isAiIdentified && (
                  <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg h-fit mt-1">
                    <Icon name="sparkles" className="w-2.5 h-2.5 text-purple-400/70" />
                    <span className="text-[9px] font-bold text-purple-400/70 tracking-wider uppercase">AI</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categoryName && categoryName !== t('uncategorized') && (
                  <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 border border-indigo-500/30">
                    <Icon name="layers" className="w-3 h-3 text-indigo-400" />
                    {categoryName}
                  </span>
                )}
                {tags.slice(0, 3).map((tag: any, idx: number) => {
                  const tagName = typeof tag === 'string' ? tag : (tag.name || tag.label);
                  if (!tagName) return null;
                  return (
                    <span key={idx} className="bg-white/5 text-white/60 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors hover:text-white hover:bg-white/10 border border-white/5">
                      #{tagName}
                    </span>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const url = photoData.image_url || photoData.url;
                  if (url) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${title || 'photo'}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    feedback.success(t('downloadSuccess') || '下載成功');
                  } else {
                    feedback.error(t('downloadFailed') || '下載失敗');
                  }
                }}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-white/10 shadow-sm"
              >
                <Icon name="download" className="w-4 h-4 text-white/80" />
                <span>{t('download') || '下載照片'}</span>
              </button>
            </div>
            
            {/* Basic Info Section */}
            {(photoData.manufacturerName || photoData.modelNumber || photoData.itemCode || photoData.price || photoData.note || (isAdmin && photoData.manualCode)) && (
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-white/30 text-[10px] font-black tracking-widest uppercase">
                  <Icon name="info" className="w-3.5 h-3.5" />
                  <span>{t('basicInfo')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {photoData.manufacturerName && (
                    <div className="flex items-center justify-between text-xs bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{t('manufacturer')}</span>
                      <span className="text-white/95 font-medium">{photoData.manufacturerName}</span>
                    </div>
                  )}
                  {photoData.modelNumber && (
                    <div className="flex items-center justify-between text-xs bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{t('model')}</span>
                      <span className="text-white/95 font-mono">{photoData.modelNumber}</span>
                    </div>
                  )}
                  {photoData.price && (
                    <div className="flex items-center justify-between text-xs bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{t('price')}</span>
                      <span className="text-white/95 font-mono">{photoData.price}</span>
                    </div>
                  )}
                  {photoData.note && (
                    <div className="flex items-center justify-between text-xs bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{t('note') || 'Note'}</span>
                      <span className="text-white/95 font-sans">{photoData.note}</span>
                    </div>
                  )}
                  {photoData.itemCode && (
                    <div className="flex items-center justify-between text-xs bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{t('sysCode')}</span>
                      <span className="text-white/95 font-mono">{photoData.itemCode}</span>
                    </div>
                  )}
                  {isAdmin && photoData.manualCode && (
                    <div className="flex items-center justify-between text-xs bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                      <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{t('manualId')}</span>
                      <span className="text-white/95 font-mono text-emerald-400">{photoData.manualCode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {displayDescription && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-white/30 text-[10px] font-black tracking-widest uppercase">
                    <Icon name="file-text" className="w-3 h-3" />
                    <span>{t('productStory')}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                    {(['zh', 'en', 'ms'] as const).map(l => {
                      const hasText = !!(descriptionObj && (typeof descriptionObj === 'object') && (descriptionObj as Record<string, string>)[l]);
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
                          className={`px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase transition-all ${lang === l ? 'bg-white text-black shadow-sm' : isAvailable ? 'text-white/60 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                        >
                          {l === 'zh' ? '中' : l === 'en' ? 'EN' : 'MS'}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-sm text-white/85 leading-relaxed font-sans font-light bg-white/[0.03] p-4 rounded-2xl italic border border-white/5">
                  "{displayDescription}"
                </div>
              </div>
            )}

            {/* Dimensions Section */}
            {photoData.dimensions && photoData.dimensions.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-white/30 text-[10px] font-black tracking-widest uppercase">
                  <Icon name="maximize" className="w-3.5 h-3.5" />
                  <span>{t('physicalSpecs')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {photoData.dimensions.map((dim, i) => {
                    const rawLabel = dim.label || '';
                    let label = translateDimensionLabelToEnglish(rawLabel);
                    
                    const isSingleValue = (!!dim.height && !dim.width && !dim.length) || 
                                          (!dim.height && !!dim.width && !dim.length) || 
                                          (!dim.height && !dim.width && !!dim.length);
                    let dimStr = '';
                    if (isSingleValue) {
                      dimStr = (dim.height || dim.width || dim.length || '').toString();
                    } else {
                      const h = dim.height ? `H${dim.height}` : '';
                      const w = dim.width ? `W${dim.width}` : '';
                      const l = dim.length ? `L${dim.length}` : '';
                      dimStr = [h, w, l].filter(Boolean).join(' x ');
                    }
                    
                    if (label.match(/\d+/) || label.includes(' x ') || !label) {
                      label = t('others');
                    }
                    const isAi = !!(dim.isAi || dim.isAiEstimated);
                    return (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/5 px-4 py-3 rounded-xl border border-white/5 group hover:bg-white/[0.08] transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 font-bold uppercase tracking-tight text-[9px]">{label}</span>
                          {isAi && (
                            <span className="text-[7px] font-bold text-purple-400/50 uppercase tracking-tighter">
                              AI
                            </span>
                          )}
                        </div>
                        <span className="text-white/95 font-mono font-bold leading-none">
                          {dimStr} <span className="text-white/30 font-normal text-[10px] ml-0.5">{dim.unit || 'cm'}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI RAW Section - Admin Only */}
            {isAdmin && (aiResult || aiLoading) && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/30 text-[10px] font-black tracking-widest uppercase">
                    <Icon name="cpu" className="w-3 h-3" />
                    <span>{t('aiDeepScan')}</span>
                  </div>
                  <button 
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[9px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5"
                  >
                    {showRaw ? t('collapse') : t('more', 0).replace(' (+0)', '')}
                    <Icon name={showRaw ? 'chevron-up' : 'chevron-down'} className="w-2.5 h-2.5" />
                  </button>
                </div>
                
                {aiLoading ? (
                  <div className="h-20 animate-pulse bg-white/5 rounded-2xl" />
                ) : (
                  showRaw && (
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 max-h-60 overflow-y-auto scrollbar-thin">
                      <pre className="text-[9px] font-mono text-emerald-400/60 whitespace-pre-wrap break-all leading-relaxed">
                        {aiResult?.rawResult || 'No raw data available'}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}

            {isAdmin && (
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3 font-mono opacity-30 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.2em] px-1">
                  <div className="flex items-center gap-3">
                     <span className="text-white/20">Ref: {photoData.itemCode || PLACEHOLDERS.EMPTY_VAL}</span>
                     <span className="text-white/20">|</span>
                      <button 
                        onClick={async () => {
                          const success = await copyToClipboard(uuid);
                          if (success) {
                            const msg = t('idCopied') || 'ID已複製';
                            if (onShowFeedback) {
                              onShowFeedback(msg, 'success');
                            } else {
                              feedback.success(msg);
                            }
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } else {
                            const msg = t('copyFailed') || '複製失敗';
                            if (onShowFeedback) {
                              onShowFeedback(msg, 'error');
                            } else {
                              feedback.error(msg);
                            }
                          }
                        }}
                        className="flex items-center gap-1.5 hover:text-white transition-colors"
                      >
                        <span>ID: {uuid.substring(uuid.length - 8)}</span>
                        {copied ? <Icon name="check" className="w-2 h-2 text-emerald-400" /> : <Icon name="copy" className="w-2 h-2" />}
                      </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
