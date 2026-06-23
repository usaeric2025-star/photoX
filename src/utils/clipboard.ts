import { logger } from '@/lib/logger';
import { showToast } from '@/lib/ui/toast';

export interface CopyOptions {
  /** 成功時顯示的提示訊息（預設：已複製） */
  successMessage?: string;
  /** 失敗時顯示的提示訊息（預設：複製失敗，請手動複製） */
  errorMessage?: string;
  /** 是否顯示成功提示（預設：true） */
  showToast?: boolean;
}

/**
 * 核心複製功能（非 Hook 版本，適用於單個函數或非組件環境）
 * 這是專案中唯二允許直接調用 navigator.clipboard 的地方
 */
export async function copyToClipboard(text: string, options?: CopyOptions): Promise<boolean> {
  if (!text) {
    showToast.error('無內容可複製');
    return false;
  }

  let success = false;

  // 1. Try synchronous textarea copy first to verify user-gesture is captured synchronously.
  // This is highly robust inside sandboxed iframes.
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Keep it invisible but on screen
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // For iOS / mobile devices:
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textArea.setSelectionRange(0, 999999);
    
    success = document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch (err) {
    logger.warn('Synchronous copy failed, trying navigator.clipboard:', err);
  }

  // 2. If synchronous copy failed, fall back to navigator.clipboard
  if (!success && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch (err) {
      logger.warn('navigator.clipboard failed:', err);
    }
  }

  if (success) {
    if (options?.showToast !== false) {
      showToast.success(options?.successMessage || '已複製');
    }
    return true;
  } else {
    showToast.error(options?.errorMessage || '複製失敗，請手動複製');
    return false;
  }
}
