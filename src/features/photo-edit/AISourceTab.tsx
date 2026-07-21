import { useAtomValue } from 'jotai';
import { appLangAtom } from '#src/store/index.js';
import React from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { feedback } from '#lib/feedback.js';
import { usePhotoEditAI, usePhotoAIResult } from './hooks/usePhotoAI.js';
import { useCopyToClipboard } from '#src/hooks/index.js';
import { } from '#lib/store/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { usePhotoEditSessionContext } from './hooks/PhotoEditSession.js';

/**
 * AISourceTab
 * 
 * 展示 AI 識別的原始記錄（JSON/Markdown）。
 */
export function AISourceTab() {
  const { photoId } = usePhotoEditSessionContext();
  const appLang = useAtomValue(appLangAtom);
  const { handleReExtract, isAnalyzing, isReExtracting } = usePhotoEditAI();
  const { copy, copied } = useCopyToClipboard({
    successMessage: appLang === 'zh' ? '已复制' : 'Copied'
  });
  
  const { data: aiResult, isPending, error } = usePhotoAIResult(photoId);

  const onReExtract = async (raw: unknown) => {
    try {
      await handleReExtract(raw);
      feedback.success(appLang === 'zh' ? '二次提取成功' : 'Re-extraction successful');
    } catch (e) {
      ErrorFactory.handle(e as Error, { context: '二次提取' });
    }
  };

  if (isPending || isAnalyzing || isReExtracting) {
    return (
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 animate-pulse">
            <div className="w-4 h-4 bg-slate-200 rounded-full" />
            <div className="h-4 bg-slate-200 rounded-lg w-32" />
        </div>
        <div className="relative group rounded-2xl border border-slate-200 bg-slate-900 shadow-sm overflow-hidden h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-slate-400 text-xs font-mono">
                    {isAnalyzing || isReExtracting ? (appLang === 'zh' ? 'AI 正在分析中...' : 'AI Analyzing...') : (appLang === 'zh' ? '载入原始數據...' : 'Loading raw data...')}
                </span>
            </div>
        </div>
      </div>
    );
  }

  if (error || !aiResult) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 border border-slate-200 border-dashed rounded-3xl mt-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 border border-amber-100">
          <Icon name="info" className="w-6 h-6" />
        </div>
        <h3 className="font-sans font-semibold text-slate-800 text-base mb-1">
          {appLang === 'zh' ? '暂无 AI 识别原始记录' : 'No AI Analysis Log Found'}
        </h3>
        <p className="text-slate-500 text-xs max-w-sm font-sans mb-4">
          {appLang === 'zh' 
            ? '尚未为此照片保存原始 LLM 识别输出。您可以在「细节」页签下运行「AI 属性识别」后重新查看。' 
            : 'No raw LLM output has been saved for this photo yet. Run "AI Analysis" in the DETAIL tab to generate it.'}
        </p>
      </div>
    );
  }

  // Prettify the JSON
  let formattedResult = '';
  try {
    if (aiResult && aiResult.rawResult) {
      const raw = typeof aiResult.rawResult === 'string' ? aiResult.rawResult.trim() : JSON.stringify(aiResult.rawResult);
      if (raw.startsWith('{') || raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        formattedResult = JSON.stringify(parsed, null, 2);
      } else {
        const match = raw.match(/```json\s+([\s\S]*?)```/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          formattedResult = JSON.stringify(parsed, null, 2);
        } else {
            formattedResult = raw;
        }
      }
    }
  } catch (e) {
    formattedResult = typeof aiResult.rawResult === 'string' ? aiResult.rawResult : JSON.stringify(aiResult.rawResult, null, 2);
  }

  if (!formattedResult || formattedResult.trim() === '') {
     formattedResult = "/* The AI result was empty or unparseable */\n\n" + String(aiResult?.rawResult);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="terminal" className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-mono font-medium text-slate-600 uppercase tracking-wider">
            {appLang === 'zh' ? '照片 AI 分析原始输出' : 'Model Output Log (Raw Source)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReExtract(aiResult.rawResult)}
            disabled={isReExtracting}
            title={appLang === 'zh' ? '重新提取属性' : 'Re-extract Meta'}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="refresh-cw" className={`w-4 h-4 ${isReExtracting ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => copy(formattedResult)}
            title={appLang === 'zh' ? '复制代码' : 'Copy Code'}
            className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-inner'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 active:scale-95 shadow-sm'
            }`}
          >
            {copied ? (
              <Icon name="check" className="w-4 h-4" />
            ) : (
              <Icon name="copy" className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="relative group rounded-2xl border border-slate-200 bg-slate-900 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
            <Icon name="file-json" className="w-3 h-3" />
            <span>agnes-response.json</span>
          </div>
        </div>
        <div className="p-4 overflow-x-auto max-h-[420px] no-scrollbar">
          <pre className="font-mono text-xs leading-relaxed text-indigo-200 whitespace-pre">
            {formattedResult}
          </pre>
        </div>
      </div>
      
      <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-[11px] font-sans">
        <Icon name="info" className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p>
          {appLang === 'zh'
            ? '本区域安全只读展示大语言模型（Agnes AI Pipeline）响应的未经结构化处理的源内容，包含特定尺寸计算规则及翻译建议，供管理员审核审计。'
            : 'This workspace displays the safe, read-only unstructured LLM payload received from the Agnes AI Pipeline, including native dimension values and translations.'}
        </p>
      </div>
    </div>
  );
}
