import { logger } from '#lib/logger.js';

export interface CopyOptions {
  /** 成功時顯示的提示訊息（預設：已複製） */
  successMessage?: string;
  /** 失敗時顯示的提示訊息（預設：複製失敗，請手動複製） */
  errorMessage?: string;
  /** 是否顯示成功提示（預設：true） */
  feedback?: boolean;
}

/**
 * 核心複製功能（非 Hook 版本，適用於單個函數或非組件環境）
 * 使用原生 API + 內容檢查 + 降級方案，確保在 iframe 和不同環境中的兼容性
 */
export async function copyToClipboard(text: string, options?: CopyOptions): Promise<boolean> {
  // ✅ 防止複製空內容或無效內容
  if (!text || text.trim() === '' || text === '{}') {
    logger.warn('[copyToClipboard] Content is empty or invalid, cancelling copy');
    return false;
  }

  try {
    // 1. 嘗試現代瀏覽器 API
    const nav = navigator as any;
    if (typeof window !== 'undefined' && nav && nav.clipboard && window.isSecureContext) {
      await nav.clipboard.writeText(text);
      return true;
    }
    throw new Error('navigator.clipboard unavailable');
  } catch (err) {
    logger.warn('[copyToClipboard] navigator.clipboard failed, trying fallback:', err);
    
    // 2. 降級方案 (Fallback using textarea)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 999999);
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return !!success;
    } catch (fallbackErr) {
      logger.error('[copyToClipboard] Fallback also failed:', fallbackErr);
      return false;
    }
  }
}
