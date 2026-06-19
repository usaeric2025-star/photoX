
import { db } from '../api/_lib/db/index.js';
import { systemLogs } from '../api/_lib/db/schema.js';
import { desc } from 'drizzle-orm';

async function fetchLogs() {
  console.log("Fetching recent AI error logs...");
  const logs = await db.query.systemLogs.findMany({
    orderBy: [desc(systemLogs.createdAt)],
    limit: 10
  });
  
  logs.forEach(log => {
    console.log(`[${log.createdAt?.toISOString()}] ${log.level} - ${log.operation}: ${log.message}`);
    if (log.metadata) console.log('Metadata:', JSON.stringify(log.metadata, null, 2));
  });
}

fetchLogs().catch(console.error);
