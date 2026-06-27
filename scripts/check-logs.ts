import { db } from '../api/_lib/db/index.js';
import { systemLogs } from '../api/_lib/db/schema.js';
import { desc } from 'drizzle-orm';

async function main() {
    const logs = await db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(20);
    console.log(JSON.stringify(logs, null, 2));
    process.exit(0);
}
main();
