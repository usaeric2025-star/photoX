import { useCallback, useState } from 'react';
import { copyToClipboard, CopyOptions } from '@/utils/clipboard';
import { showToast } from '@/lib/ui/toast';

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
        showToast.error(options?.errorMessage || '複製失敗，請手動複製');
      }
    },
    [options]
  );

  return { copy, copied };
};
