import { createRouter, defineRoute, param } from "type-route";

export const { RouteProvider, useRoute, routes } = createRouter({
  // 首頁 (含過濾參數)
  home: defineRoute({
    q: param.query.optional.string,
    cat: param.query.optional.string,
    tag: param.query.optional.array.string,
    sort: param.query.optional.string,
    view: param.query.optional.string,
    columns: param.query.optional.number,
    showGroupsCollapsed: param.query.optional.boolean,
    photoId: param.query.optional.string,
  }, () => "/"),
  
  // 公開合組
  publicGroup: defineRoute(
    { slug: param.path.string, q: param.query.optional.string, photoId: param.query.optional.string },
    (p) => `/group/${p.slug}`
  ),
  
  // 管理合組
  adminGroup: defineRoute(
    { id: param.path.string, q: param.query.optional.string, photoId: param.query.optional.string },
    (p) => `/admin/group/${p.id}`
  ),
  
  // 照片燈箱 (路徑導引)
  photo: defineRoute(
    { photoId: param.path.string },
    (p) => `/photo/${p.photoId}`
  ),
  
  // 管理頁面 (含過濾參數)
  admin: defineRoute({
    q: param.query.optional.string,
    cat: param.query.optional.string,
    tag: param.query.optional.array.string,
    sort: param.query.optional.string,
    status: param.query.optional.string,
    batch: param.query.optional.string,
    view: param.query.optional.string,
    columns: param.query.optional.number,
    photoId: param.query.optional.string,
  }, () => "/admin"),
  
  adminTasks: defineRoute("/admin/tasks"),
  adminDiagnostics: defineRoute("/admin/diagnose"),
  adminDiagnosticsLogs: defineRoute("/admin/error-logs"),
  adminBatchEdit: defineRoute("/admin/batch-edit"),
  
  // 設定頁面
  settings: defineRoute("/settings"),
  
  // 診斷頁面
  diagnostics: defineRoute("/diagnostics"),
});

// 導出類型 (如果需要)
// export type Routes = typeof routes;
