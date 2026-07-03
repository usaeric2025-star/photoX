const fs = require('fs');
let code = fs.readFileSync('api/_lib/middleware.ts', 'utf8');

const target = `      // 為頻繁讀取的靜態型錄路由加上 Cache-Control
      if (c.req.method === 'GET') {
        const path = c.req.path;
        if (path.startsWith('/api/tags') || 
            path.startsWith('/api/categories') || 
            path.startsWith('/api/manufacturers') || 
            path.startsWith('/api/groups')) {
          // CDN 快取 10 秒，在背景重新驗證 60 秒，減少資料庫壓力
          c.header('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
        }
      }`;

const replacement = `      // 為頻繁讀取的靜態型錄路由與列表加上 Cache-Control (Vercel Edge 緩存與防護 504)
      if (c.req.method === 'GET') {
        const path = c.req.path;
        if (path.startsWith('/api/tags') || 
            path.startsWith('/api/categories') || 
            path.startsWith('/api/manufacturers') || 
            path.startsWith('/api/groups')) {
          // CDN 快取 10 秒，在背景重新驗證 60 秒，減少資料庫壓力與冷啟動
          c.header('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
        } else if (path.startsWith('/api/public/settings') || path.startsWith('/api/system/health')) {
          // 長效快取
          c.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        }
      } else if (c.req.method === 'POST') {
        const path = c.req.path;
        // 針對 POST 的查詢 API 也能加 Edge 緩存，Vercel 支援帶有 Vercel-CDN-Cache-Control 的 POST 查詢緩存
        if (path.endsWith('/list') || path.endsWith('/list-by-group') || path.endsWith('/list-by-group-paginated')) {
            c.header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
            c.header('Vercel-CDN-Cache-Control', 'max-age=15, stale-while-revalidate=30');
        }
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('api/_lib/middleware.ts', code);
