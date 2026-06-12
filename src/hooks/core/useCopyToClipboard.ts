import { useCallback, useState } from 'react';
import { copyToClipboard, CopyOptions } from '@/utils/clipboard';

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
        options?.onCopy?.(text);
        
        // 2 秒後重置狀態
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [options]
  );

  return { copy, copied };
};
