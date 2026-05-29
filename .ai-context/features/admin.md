# Feature: 管理端操作

## 相关文件
- `src/features/admin/useAdminActions.ts` - 删除/更新操作
- `src/hooks/mutations/usePhotoMutations.ts` - 底层 mutation
- `src/services/photos.ts` - API 调用（返回 Result 类型）

## 数据流
用户点击删除 → useAdminActions.deletePhoto → usePhotoMutations → photoService → 返回 Result → UI 反馈

## 修改此功能时，AI 需要同时读取以上文件
