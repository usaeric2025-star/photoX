import { db } from './api/_lib/db/index.js';
import { eq } from 'drizzle-orm';
import { aiAuditLogs } from './api/_lib/db/schema.js';

async function main() {
  const photoId = '23c6595a-6a3e-4237-96c7-67f6e9d2d3f3';
  const res = await db.query.aiAuditLogs.findFirst({
      where: eq(aiAuditLogs.photoId, photoId)
  });
  console.log(res);
  process.exit(0);
}
main().catch(console.error);
