import { db } from './api/_lib/db/index.js';
import { systemLogs } from './api/_lib/db/schema.js';
import { desc, gt } from 'drizzle-orm';

async function main() {
  try {
    // 2 hours ago
    const boundary = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const logs = await db.select()
      .from(systemLogs)
      .where(gt(systemLogs.createdAt, boundary))
      .orderBy(desc(systemLogs.createdAt))
      .limit(100);
    
    console.log(`=== SYSTEM LOGS IN LAST 2 HOURS (count: ${logs.length}) ===`);
    for (const log of logs) {
      console.log(`[${log.createdAt?.toISOString()}] [${log.level}] [${log.operation}] ${log.message}`);
      if (log.metadata) {
        console.log("Metadata:", JSON.stringify(log.metadata, null, 2));
      }
      console.log("-----------------------------------------");
    }
  } catch (error) {
    console.error("FAIL TO FETCH LOGS:", error);
  } finally {
    process.exit(0);
  }
}

main();
