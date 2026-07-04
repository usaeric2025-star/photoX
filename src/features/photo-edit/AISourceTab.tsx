import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import React from 'react';
import { usePhotoEditAI, usePhotoAIResult, useCopyToClipboard } from '#src/hooks/index.js';
import { useUI } from '#lib/store/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { usePhotoEditSessionContext } from '#src/hooks/photo/usePhotoEditSessionContext.js';

export function AISourceTab() {
  const { photoId } = usePhotoEditSessionContext();
  const appLang = useUI((s) => s.appLang);
  const { handleReExtract } = usePhotoEditAI();
  const { copy, copied } = useCopyToClipboard({
    successMessage: appLang === 'zh' ? '已复制' : 'Copied'
  });
  const { data: aiResult, isPending, error } = usePhotoAIResult(photoId);

  if (isPending) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-8 bg-slate-200 rounded-xl w-1/4"></div>
        <div className="h-64 bg-slate-200 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (error || !aiResult || !aiResult.rawResult) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 border border-slate-200 border-dashed rounded-3xl mt-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 border border-amber-100">
          <Icon name="info" className="w-6 h-6" />
        </div>
        <h3 className="font-sans font-semibold text-slate-800 text-base mb-1">
          {appLang === 'zh' ? '暂无 AI 识别原始源代碼' : 'No Raw AI Source Found'}
        </h3>
        <p className="text-slate-500 text-xs max-w-sm font-sans mb-4">
          {appLang === 'zh' 
            ? '尚未为此照片保存原始 LLM 识别输出。您可以在「细节 (DETAIL)」页签下运行「AI 属性智能识别」之后重新查看此处。' 
            : 'No raw LLM output has been saved for this photo yet. Run "AI Intelligent Recognition" in the "DETAIL" tab to generate it.'}
        </p>
      </div>
    );
  }

  // Prettify the JSON if it's stringified JSON, otherwise show raw text
  let formattedResult = '';
  if (aiResult && aiResult.rawResult) {
    try {
      const raw = typeof aiResult.rawResult === 'string' ? aiResult.rawResult.trim() : JSON.stringify(aiResult.rawResult);
      // If it looks like JSON or contains JSON wrapping, try to parse and format it
      if (raw.startsWith('{') || raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        formattedResult = JSON.stringify(parsed, null, 2);
      } else {
        // Check if it has markdown block ```json ... ```
        const match = raw.match(/```json\s+([\s\S]*?)```/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          formattedResult = JSON.stringify(parsed, null, 2);
        } else {
            formattedResult = raw;
        }
      }
    } catch (e) {
      // Keep original string if parsing fails
      ErrorFactory.handleError(e, "格式化 AI 响应");
      formattedResult = typeof aiResult.rawResult === 'string' ? aiResult.rawResult : JSON.stringify(aiResult.rawResult, null, 2);
    }
  }

  // Final fallback to ensure the pre isn't actually empty
  if (!formattedResult || formattedResult.trim() === '') {
     formattedResult = "/* The AI result was empty or unparseable */\n\n" + String(aiResult?.rawResult);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="terminal" className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-mono font-medium text-slate-600 uppercase tracking-wider">
            {appLang === 'zh' ? '照片 AI 分析原始输出 (JSON / Markdown)' : 'Model Output Log (Raw Source)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReExtract(aiResult.rawResult)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-sans font-medium hover:bg-indigo-100 transition-all active:scale-95"
          >
            <Icon name="refresh-cw" className="w-3.5 h-3.5" />
            <span>{appLang === 'zh' ? '二次提取分类与标签' : 'Re-extract Meta'}</span>
          </button>
          <button
            onClick={() => copy(formattedResult)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-sans font-medium transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Icon name="check" className="w-3.5 h-3.5" />
                <span>{appLang === 'zh' ? '已复制' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Icon name="copy" className="w-3.5 h-3.5" />
                <span>{appLang === 'zh' ? '复制代码' : 'Copy Code'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative group rounded-2xl border border-slate-200 bg-slate-900 shadow-sm overflow-hidden">
        {/* Top title bar */}
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

        {/* Console / Code view box */}
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
