export interface GallerySearchParams {
  q?: string;
  category?: string;
  tag?: string;          // Added for tag filtering
  manufacturer?: string;
  sort?: 'newest' | 'oldest' | 'name';
  view?: 'grid' | 'list';
  authError?: string;
  
  photoId?: string;      // 灯箱当前照片 ID
  groupId?: string;      // 当前选中的合组 ID
  columns?: string;      // 列数（2/3/4/5）
  showGroupsCollapsed?: 'true' | 'false';  // 合组折叠状态
  hidden?: 'true' | 'false';       // 隐藏照片显影控制
  onlyUngrouped?: 'true' | 'false'; // 仅显示未分组照片
}
