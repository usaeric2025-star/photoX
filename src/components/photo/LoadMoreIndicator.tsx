import { Button } from '@/components/shared/Button';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';

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
      <div className="text-center py-8 text-muted-foreground text-sm font-medium tracking-tight opacity-50">
        已加载全部照片
      </div>
    );
  }

  // 正在加载
  if (isFetchingNextPage) {
    return (
      <div className="flex justify-center py-4 w-full opacity-60 pointer-events-none">
        <PhotoGridSkeleton columns={3} count={3} />
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
