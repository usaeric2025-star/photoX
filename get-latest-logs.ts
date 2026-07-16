import { db } from './api/_lib/db/index.js';
import { systemLogs } from './api/_lib/db/schema.js';
import { desc } from 'drizzle-orm';

async function main() {
  console.log('Fetching latest 10 errors/warns from system_logs...');
  try {
    const logs = await db.select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.id))
      .limit(10);
    
    console.log(`Found ${logs.length} logs:`);
    for (const log of logs) {
      console.log(`- [${log.createdAt}] Level: ${log.level} | Op: ${log.operation} | Msg: ${log.message}`);
      console.log(`  URL: ${log.url}`);
      if (log.metadata) {
         console.log(`  Meta:`, JSON.stringify(log.metadata, null, 2));
      }
      console.log('---');
    }
  } catch (err: any) {
    console.error('Error fetching logs:', err.message || err);
  } finally {
    process.exit(0);
  }
}

main();
