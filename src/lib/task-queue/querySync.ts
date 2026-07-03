import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { scheduler } from './scheduler.js';

type FlushableTimeout = ReturnType<typeof setTimeout> & { flushed?: boolean };

let invalidateTimer: FlushableTimeout | null = null;
let pendingInvalidations = new Set<string>();

// ✅ 封裝為可清理的初始化函數
export function setupQuerySync(): () => void {
  scheduler.onTaskComplete = (task) => {
    if (task.state.status !== 'completed') return;

    switch (task.type) {
      case 'upload':
        pendingInvalidations.add('photos_list');
        scheduleInvalidation();
        break;

      case 'ai-analyze':
        // ✅ 本地更新單條數據（不需防抖）
        if (task.meta?.photoId) {
          const detailKey = queryKeys.photos.detail(String(task.meta.photoId));
          queryClient.setQueryData(detailKey, (old: any) => ({
            ...(old && typeof old === 'object' ? old : {}),
            aiTags: (task.state as { status: 'completed'; result?: { tags: string[] } }).result?.tags,
          }));
          // ✅ 同時使 AI 詳細結果失效以觸發重新加載
          queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', String(task.meta.photoId)] });
        }
        break;

      case 'repair':
        pendingInvalidations.add('diagnostics');
        scheduleInvalidation();
        break;
    }
  };

  // ✅ 返回 cleanup 函數
  return () => {
    if (invalidateTimer) {
      clearTimeout(invalidateTimer);
      flushInvalidations(); // 強制執行
    }
  };
}

function scheduleInvalidation() {
  if (invalidateTimer) {
    clearTimeout(invalidateTimer);
  }
  invalidateTimer = setTimeout(() => {
    flushInvalidations();
  }, 2000);
}

// ✅ 暴露 flush 方法
function flushInvalidations() {
  if (pendingInvalidations.size === 0) return;

  const keys = Array.from(pendingInvalidations);
  pendingInvalidations.clear();

  keys.forEach(key => {
    switch (key) {
      case 'photos_list':
        queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
        break;
      case 'diagnostics':
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
        break;
    }
  });

  if (invalidateTimer) {
    clearTimeout(invalidateTimer);
    invalidateTimer = null;
  }
}

// ✅ HMR 安全
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    flushInvalidations();
  });
}
