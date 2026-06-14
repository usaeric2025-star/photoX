import { useOptimistic, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseOptimisticReorderOptions<T> {
  items: T[];
  queryKey: unknown[];
  updateFn: (newOrder: string[]) => Promise<void>;
  getId: (item: T) => string;
}

export const useOptimisticReorder = <T>({
  items,
  queryKey,
  updateFn,
  getId,
}: UseOptimisticReorderOptions<T>) => {
  const queryClient = useQueryClient();
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state, newOrder: string[]) => {
      const orderMap = new Map(newOrder.map((id, idx) => [id, idx]));
      return [...state].sort((a, b) => orderMap.get(getId(a))! - orderMap.get(getId(b))!);
    }
  );

  const reorder = useCallback(async (newOrder: string[]) => {
    setOptimisticItems(newOrder);
    try {
      await updateFn(newOrder);
    } catch (error) {
      // 失敗時重新獲取原始數據
      await queryClient.invalidateQueries({ queryKey });
    }
  }, [setOptimisticItems, updateFn, queryKey, queryClient]);

  return { items: optimisticItems, reorder };
};
