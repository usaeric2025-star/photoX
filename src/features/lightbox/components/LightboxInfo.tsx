import React, { useState } from 'react';
import { AnimatePresence, motion } from 'lite-sleek';
import { Icon } from '#src/components/ui/Icon.js';
import { usePhoto, usePhotoAIResult, usePermission, useAdminMode, useTranslation, useCategories } from '#src/hooks/index.js';
import { Photo } from '#src/types/photo.js';
import { getLocalizedDisplay, translateDimensionLabelToEnglish } from '#src/utils/display.js';
import { getTranslatedCategoryName } from '#src/utils/category.js';
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

type InfoTab = 'overview' | 'specs' | 'ai';

/**
 * LightboxInfo
 * 
 * 燈箱右側的信息面板，採用 Tab 分頁切換，適合移動端操作且避免深下拉。
 * 包含：概要（名稱、分類、標籤、故事、下載）、規格（價格、型號、尺寸）、AI與系統日誌。
 */
export function LightboxInfo({
  currentPhoto,
  showInfo,
  lang,
  onLangChange,
  onShowFeedback
}: LightboxInfoProps) {
  const { t, uiTranslations } = useTranslation();
  const [activeTab, setActiveTab] = useState<InfoTab>('overview');
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  
  const basePhotoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const { data: fullPhotoData } = usePhoto(basePhotoData.id);
  const photoData = fullPhotoData || basePhotoData;
  const descriptionObj = photoData?.description;
  const displayDescription = getLocalizedDisplay(descriptionObj, lang);
  const title = getLocalizedDisplay(photoData.name || t('unnamedItem'), lang);
  const uuid = photoData.id || PLACEHOLDERS.EMPTY_VAL;
  
  const { categories = [] } = useCategories();
  const catNameFromHook = getTranslatedCategoryName(photoData.categoryId, categories, lang, uiTranslations);
  const categoryName = catNameFromHook || photoData.categoryDescription?.[lang] || photoData.categoryName || '';
  
  const rawTags = photoData.tags || (photoData as any).photoTags || (photoData as any).photo_tags || [];
  const tags = Array.isArray(rawTags) ? rawTags : [];
  
  const { can } = usePermission();
  const isAdminMode = useAdminMode();
  const isAdmin = isAdminMode && can('photo:view-internal-info');
  
  const { data: aiResult, isLoading: aiLoading } = usePhotoAIResult(photoData.id, { 
    enabled: showInfo && isAdmin
  });

  const isAiIdentified = !!(photoData.metadata && (photoData.metadata as Record<string, unknown>).ai_raw) || !!photoData.isAnalyzing;

  const hasSpecs = !!(
    photoData.manufacturerName || 
    photoData.modelNumber || 
    photoData.itemCode || 
    photoData.price || 
    photoData.note || 
    (isAdmin && photoData.manualCode) ||
    (photoData.dimensions && photoData.dimensions.length > 0)
  );

  const hasAiOrSystem = isAdmin || isAiIdentified || !!aiResult;

  return (
    <AnimatePresence>
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.96 }}
          transition="fast"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-16 sm:top-20 right-3 sm:right-6 w-[calc(100vw-24px)] max-w-[380px] sm:w-[390px] max-h-[calc(100vh-140px)] flex flex-col rounded-3xl bg-zinc-950/95 border border-white/15 shadow-2xl overflow-hidden pointer-events-auto z-40"
        >
          {/* Header Segmented Tabs (Mobile-first ergonomics) */}
          <div className="p-2 sm:p-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'overview'
                  ? 'bg-white text-zinc-950 shadow-md scale-[1.02]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon name="file-text" className="w-3.5 h-3.5 shrink-0" />
              <span>{t('overview') || '概要'}</span>
            </button>

            {hasSpecs && (
              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                  activeTab === 'specs'
                    ? 'bg-white text-zinc-950 shadow-md scale-[1.02]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon name="maximize" className="w-3.5 h-3.5 shrink-0" />
                <span>{t('specs') || '規格'}</span>
              </button>
            )}

            {hasAiOrSystem && (
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                  activeTab === 'ai'
                    ? 'bg-purple-500 text-white shadow-md scale-[1.02]'
                    : 'text-purple-300/70 hover:text-purple-300 hover:bg-purple-500/10'
                }`}
              >
                <Icon name="sparkles" className="w-3.5 h-3.5 shrink-0" />
                <span>AI</span>
              </button>
            )}
          </div>

          {/* Scrollable Content Container (Controlled height) */}
          <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar space-y-5 flex-1 min-h-0">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition="fast"
                className="space-y-4"
              >
                {/* Title & AI Badge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                      {t('productName')}
                    </span>
                    {isAiIdentified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-[10px] font-bold text-purple-300">
                        <Icon name="sparkles" className="w-3 h-3 text-purple-300" />
                        <span>AI</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-extrabold text-lg sm:text-xl leading-snug tracking-tight">
                    {title}
                  </h3>
                </div>

                {/* Category & Tags Badges */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold tracking-wider text-white/40 uppercase">
                    {t('categoryAndTags') || '分類與標籤'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {categoryName && (
                      <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 border border-indigo-500/30">
                        <Icon name="layers" className="w-3.5 h-3.5 text-indigo-400" />
                        {categoryName}
                      </span>
                    )}
                    {tags.length > 0 ? (
                      tags.map((tag: any, idx: number) => {
                        const tagName = typeof tag === 'string'
                          ? tag
                          : (tag.name || tag.label || tag.tags?.name || tag.tag?.name);
                        if (!tagName) return null;
                        return (
                          <span key={idx} className="bg-white/5 text-white/80 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/10">
                            #{tagName}
                          </span>
                        );
                      })
                    ) : (
                      !categoryName && (
                        <span className="text-xs text-white/30 italic">
                          {t('noCategoryOrTags') || '無分類或標籤'}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Product Story / Description */}
                {displayDescription && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                        {t('productStory')}
                      </span>
                      {/* Language Switcher Pills */}
                      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        {(['zh', 'en', 'ms'] as const).map(l => {
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onLangChange(l);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                                lang === l 
                                  ? 'bg-white text-black shadow-sm font-extrabold scale-105' 
                                  : 'text-white/60 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {l === 'zh' ? '中' : l === 'en' ? 'EN' : 'MS'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-white/90 leading-relaxed font-sans bg-white/[0.03] p-3.5 rounded-2xl italic border border-white/5">
                      "{displayDescription}"
                    </div>
                  </div>
                )}

                {/* Quick Download Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = photoData.imageUrl || photoData.uri || photoData.image_url || photoData.url;
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
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-white/10 shadow-sm cursor-pointer"
                  >
                    <Icon name="download" className="w-4 h-4 text-white/80" />
                    <span>{t('download') || '下載原圖'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 2: SPECS & DETAILS */}
            {activeTab === 'specs' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition="fast"
                className="space-y-4"
              >
                {/* Basic Attributes Grid */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                    {t('basicInfo')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {photoData.manufacturerName && (
                      <div className="col-span-2 flex items-center justify-between text-xs bg-white/[0.04] px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-white/40 font-bold uppercase text-[10px]">{t('manufacturer')}</span>
                        <span className="text-white/95 font-medium">{photoData.manufacturerName}</span>
                      </div>
                    )}
                    {photoData.modelNumber && (
                      <div className="col-span-1 flex flex-col gap-0.5 text-xs bg-white/[0.04] px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-white/40 font-bold uppercase text-[9px]">{t('model')}</span>
                        <span className="text-white/95 font-mono font-medium truncate">{photoData.modelNumber}</span>
                      </div>
                    )}
                    {photoData.price && (
                      <div className="col-span-1 flex flex-col gap-0.5 text-xs bg-white/[0.04] px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-white/40 font-bold uppercase text-[9px]">{t('price')}</span>
                        <span className="text-emerald-400 font-mono font-bold truncate">{photoData.price}</span>
                      </div>
                    )}
                    {photoData.itemCode && (
                      <div className="col-span-1 flex flex-col gap-0.5 text-xs bg-white/[0.04] px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-white/40 font-bold uppercase text-[9px]">{t('sysCode')}</span>
                        <span className="text-white/90 font-mono text-[11px] truncate">{photoData.itemCode}</span>
                      </div>
                    )}
                    {isAdmin && photoData.manualCode && (
                      <div className="col-span-1 flex flex-col gap-0.5 text-xs bg-white/[0.04] px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-white/40 font-bold uppercase text-[9px]">{t('manualId')}</span>
                        <span className="text-emerald-400 font-mono text-[11px] font-bold truncate">{photoData.manualCode}</span>
                      </div>
                    )}
                    {photoData.note && (
                      <div className="col-span-2 flex flex-col gap-0.5 text-xs bg-white/[0.04] px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-white/40 font-bold uppercase text-[9px]">{t('note') || 'Note'}</span>
                        <span className="text-white/90 font-sans">{photoData.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimensions */}
                {photoData.dimensions && photoData.dimensions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                      {t('physicalSpecs')}
                    </span>
                    <div className="space-y-2">
                      {photoData.dimensions.map((dim, i) => {
                        const rawLabel = dim.label || '';
                        let label = lang === 'zh' ? rawLabel : translateDimensionLabelToEnglish(rawLabel);
                        
                        const isSingleValue = (!!dim.height && !dim.width && !dim.length) || 
                                              (!dim.height && !!dim.width && !dim.length) || 
                                              (!dim.height && !dim.width && !!dim.length);
                        let dimStr = '';
                        if (isSingleValue) {
                          dimStr = (dim.height || dim.width || dim.length || '').toString();
                        } else {
                          const h = dim.height ? `H ${dim.height}` : '';
                          const w = dim.width ? `W ${dim.width}` : '';
                          const l = dim.length ? `L ${dim.length}` : '';
                          dimStr = [h, w, l].filter(Boolean).join(' × ');
                        }
                        
                        if (!label || label.match(/\d+/) || label.includes(' x ')) {
                          label = t('physicalSpecs') || 'Specs';
                        }

                        const isAi = !!(dim.isAi || dim.isAiEstimated);

                        return (
                          <div key={i} className="bg-white/[0.04] p-3 rounded-2xl border border-white/5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/90 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                {label}
                              </span>
                              {isAi && (
                                <span className="flex items-center gap-1 text-[9px] font-semibold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/20">
                                  <Icon name="sparkles" className="w-2.5 h-2.5 text-purple-300" />
                                  <span>{lang === 'zh' ? 'AI 預估' : 'AI Estimated'}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline justify-between pt-0.5">
                              <span className="text-white font-mono text-sm font-bold">
                                {dimStr}
                              </span>
                              <span className="text-white/40 font-mono text-xs font-semibold">
                                {dim.unit || 'cm'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: AI & SYSTEM */}
            {activeTab === 'ai' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition="fast"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase">
                      {t('aiDeepScan')}
                    </span>
                    {isAdmin && (
                      <button 
                        type="button"
                        onClick={() => setShowRaw(!showRaw)}
                        className="text-[9px] font-bold uppercase tracking-wider text-purple-300 hover:text-white transition-colors flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 cursor-pointer"
                      >
                        <span>{showRaw ? t('collapse') : (lang === 'zh' ? 'RAW 日誌' : 'RAW Log')}</span>
                        <Icon name={showRaw ? 'chevron-up' : 'chevron-down'} className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {aiLoading ? (
                    <div className="h-20 animate-pulse bg-white/5 rounded-2xl flex items-center justify-center text-xs text-white/40">
                      <span>{t('analyzing') || 'AI 分析中...'}</span>
                    </div>
                  ) : showRaw ? (
                    <div className="bg-black/80 rounded-2xl p-3 border border-purple-500/20 max-h-48 overflow-y-auto no-scrollbar">
                      <pre className="text-[10px] font-mono text-emerald-400/90 whitespace-pre-wrap break-all leading-relaxed">
                        {aiResult?.rawResult || 'No raw data available'}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-purple-950/30 p-3.5 rounded-2xl border border-purple-500/20 space-y-2 text-xs text-purple-200">
                      <div className="flex items-center gap-2 font-bold text-purple-300">
                        <Icon name="sparkles" className="w-4 h-4" />
                        <span>{t('aiAnalysisComplete') || 'AI 智能分析完成'}</span>
                      </div>
                      <p className="text-[11px] text-purple-200/80 leading-relaxed">
                        {aiResult?.summary || (lang === 'zh' ? '系統已自動完成照片分類、尺寸預估及關鍵標籤提取。' : 'System has completed category, dimension, and tag extraction.')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Ref & ID Copy */}
                {isAdmin && (
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>Ref: {photoData.itemCode || PLACEHOLDERS.EMPTY_VAL}</span>
                    <button 
                      type="button"
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
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer bg-white/5 px-2 py-1 rounded-lg border border-white/5"
                    >
                      <span>ID: {uuid.substring(uuid.length - 8)}</span>
                      {copied ? <Icon name="check" className="w-3 h-3 text-emerald-400" /> : <Icon name="copy" className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

