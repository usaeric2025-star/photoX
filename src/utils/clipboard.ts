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

  try {
    await navigator.clipboard.writeText(text);
    
    if (options?.showToast !== false) {
      showToast.success(options?.successMessage || '已複製');
    }
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    showToast.error(options?.errorMessage || '複製失敗，請手動複製');
    return false;
  }
}
