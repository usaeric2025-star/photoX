/**
 * @hook-contract
 * @description Provides a batch confirmation dialog for admin actions to prevent accidental bulk updates/deletions.
 * @inputs { actionType: 'delete' | 'hide' | 'show', selectedCount: number, onConfirm: () => void }
 * @outputs { openDialog: () => void, isPending: boolean }
 * @invariants Confirmation dialog must trigger exactly once, onConfirm must only execute after user approval.
 */
import { useFeedback } from '@/hooks';
import { useStore } from '@/store';
import { useCallback, useState } from 'react';

export const useBatchConfirmation = ({
  actionType,
  selectedCount,
  onConfirm
}: {
  actionType: 'delete' | 'hide' | 'show';
  selectedCount: number;
  onConfirm: () => void;
}) => {
  const [isPending, setIsPending] = useState(false);
  const { setAlertDialog } = useStore();
  const { handleError } = useFeedback();

  const openDialog = useCallback(() => {
    setAlertDialog({
      title: '批量操作確認 / Confirm Bulk Action',
      message: `确定执行 "${actionType}" 操作吗？(共 ${selectedCount} 项) / Are you sure to "${actionType}"? (${selectedCount} items)`,
      confirmText: '确认 / Confirm',
      cancelText: '取消 / Cancel',
      onConfirm: async () => {
        setIsPending(true);
        try {
          await onConfirm();
        } catch (error) {
          handleError(error as Error, '批量操作失败 / Batch action failed');
        } finally {
          setIsPending(false);
        }
      }
    });
  }, [actionType, selectedCount, onConfirm, setAlertDialog, handleError]);

  return { openDialog, isPending };
};
