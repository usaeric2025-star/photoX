import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/errorTracker';
import { photoKeys } from '@/lib/queryKeys';
import { Heart } from 'lucide-react';

export function PinButton({ photoId, isPinned }: { photoId: string; isPinned: boolean }) {
  const queryClient = useQueryClient();
  const [optimisticPinned, setOptimisticPinned] = useState(isPinned);

  useEffect(() => {
    setOptimisticPinned(isPinned);
  }, [isPinned]);

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, currentPinned }: { id: string; currentPinned: boolean }) => {
      const { error } = await supabase.from('furniture_items').update({ is_pinned: !currentPinned }).eq('id', id);
      if (error) throw error;
      return !currentPinned;
    },
    onMutate: async ({ currentPinned }) => {
      setOptimisticPinned(!currentPinned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
    onError: (err, { currentPinned }) => {
      setOptimisticPinned(currentPinned); // Rollback
      reportError(err as Error, `TogglePin photoId=${photoId}`);
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinMutation.mutate({ id: photoId, currentPinned: isPinned });
  };

  const isPending = togglePinMutation.isPending;

  return (
    <button 
      onClick={handleClick}
      disabled={isPending}
      className="absolute top-1 right-2 bg-black/50 p-1 rounded-full text-white data-[pinned=true]:text-red-500 z-20 hover:scale-115 active:scale-95 transition-transform disabled:opacity-50"
      data-pinned={optimisticPinned ? 'true' : 'false'}
    >
      <Heart size={12} className={optimisticPinned ? 'fill-current' : ''} />
      {togglePinMutation.isError && <span className="absolute right-0 top-full mt-1 text-[8px] bg-red-500 text-white px-1 py-0.5 rounded shadow-sm whitespace-nowrap">{(togglePinMutation.error as Error).message}</span>}
    </button>
  );
}
