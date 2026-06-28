import { useCallback, useState } from 'react';
import { copyToClipboard, CopyOptions } from '@/utils/clipboard';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

interface UseCopyToClipboardOptions extends CopyOptions {
  /** 複製後的 callback */
  onCopy?: (text: string) => void;
}

export const useCopyToClipboard = (options?: UseCopyToClipboardOptions) => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text, options);
      if (success) {
        setCopied(true);
        if (options?.showToast !== false) {
          showToast.success(options?.successMessage || '已複製');
        }
        options?.onCopy?.(text);
        
        // 2 秒後重置狀態
        setTimeout(() => setCopied(false), 2000);
      } else {
        ErrorFactory.handle(options?.errorMessage || '複製失敗，請手動複製', { context: '剪贴板操作' });
      }
    },
    [options]
  );

  return { copy, copied };
};
