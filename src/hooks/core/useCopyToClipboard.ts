import { useCallback, useState } from 'react';
import { copyToClipboard, CopyOptions } from '#src/utils/clipboard.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

import { useTranslation } from '#src/hooks/index.js';

interface UseCopyToClipboardOptions extends CopyOptions {
  /** 複製後的 callback */
  onCopy?: (text: string) => void;
}

export const useCopyToClipboard = (options?: UseCopyToClipboardOptions) => {
  const [copied, setCopied] = useState(false);
  const { uiTranslations: t } = useTranslation();

  const copy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text, options);
      if (success) {
        setCopied(true);
        if (options?.showToast !== false) {
          showToast.success(options?.successMessage || t.copySuccess);
        }
        options?.onCopy?.(text);
        
        // 2 秒後重置狀態
        setTimeout(() => setCopied(false), 2000);
      } else {
        ErrorFactory.handle(options?.errorMessage || t.copyFailed, { context: 'clipboard-op' });
      }
    },
    [options, t]
  );

  return { copy, copied };
};
