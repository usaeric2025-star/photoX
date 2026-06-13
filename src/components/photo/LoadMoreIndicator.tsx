import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';

interface LoadMoreIndicatorProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
}

export const LoadMoreIndicator = ({
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: LoadMoreIndicatorProps) => {
  // 无更多数据
  if (!hasNextPage) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        已加载全部照片
      </div>
    );
  }

  // 正在加载
  if (isFetchingNextPage) {
    return (
      <div className="flex justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">加载更多...</span>
        </div>
      </div>
    );
  }

  // 加载更多按钮（用户主动点击）
  return (
    <div className="flex justify-center py-8">
      <Button
        variant="outline"
        onClick={onLoadMore}
        className="px-8"
      >
        加载更多
      </Button>
    </div>
  );
};
