import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // Node environment handling
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback: serve index.html for all non-file requests
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL ERROR: Server failed to start", err);
  process.exit(1);
});
