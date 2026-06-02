import { handle } from "hono/vercel";

// 添加错误捕获，定位具体是哪个模块加载失败
let appmodule: any;
try {
  const module = await import("../server");
  appmodule = module.app;
  console.log("[API] Server module loaded successfully");
} catch (err) {
  console.error("[API] Failed to load server module:", err);
  // 重新抛出，让 Vercel 记录错误
  throw err;
}

export default handle(appmodule);
