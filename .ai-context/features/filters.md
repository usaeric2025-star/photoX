# Feature: 照片筛选

## 相关文件
- `src/features/filters/filters.machine.ts` - XState 状态机（Part 2 创建）
- `src/features/filters/useFilters.ts` - React 封装
- `src/components/PhotoGrid.tsx` - 展示筛选结果
- `src/lib/queryKeys.ts` - Query Key 工厂

## 数据流
用户点击标签 → 发送事件 → XState 更新上下文 → 触发 Query 重新请求 → 渲染

## 修改此功能时，AI 需要同时读取以上文件
