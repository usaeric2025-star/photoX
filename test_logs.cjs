const { db, systemLogs, aiAuditLogs } = require('./dist/server.cjs');
// wait, the server uses ES modules or commonjs depending on build. Let's just query Postgres directly.
