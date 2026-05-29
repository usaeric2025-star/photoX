# Feature: 照片管理

## 相关文件
- `src/features/photos/usePhotoGallery.ts` - 照片查询与无限滚动
- `src/features/admin/useAdminActions.ts` - 照片删除/更新操作
- `src/hooks/queries/usePhotos.ts` - TanStack Query 封装
- `src/features/filters/useFilters.ts` - 筛选状态

## 数据流
筛选变化 → usePhotoGallery 自动重新请求 → 返回 photos → UI 渲染

## 修改此功能时，AI 需要同时读取以上文件
