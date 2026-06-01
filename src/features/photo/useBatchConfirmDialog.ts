import { useUIStore, useShallow } from '@/store/useUIStore';

interface Config {
  actionType: 'delete' | 'show' | 'hide';
  selectedCount: number;
  onConfirm: () => void;
}

export function useBatchConfirmation({ actionType, selectedCount, onConfirm }: Config) {
  const { update } = useUIStore(useShallow(s => ({ update: s.update })));

  const openDialog = () => {
    const titles = {
      delete: '确认批量删除',
      show: '确认批量显示',
      hide: '确认批量隐藏'
    };

    const messages = {
      delete: `确定要删除选中的 ${selectedCount} 张照片吗？此操作不可撤销。`,
      show: `确定要显示选中的 ${selectedCount} 张照片吗？`,
      hide: `确定要隐藏选中的 ${selectedCount} 张照片吗？`
    };

    update({ alertDialog: {
      title: titles[actionType],
      message: messages[actionType],
      onConfirm: () => {
        onConfirm();
        update({ alertDialog: null });
      }
    } });
  };

  return { openDialog };
}
