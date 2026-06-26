import { db, systemLogs } from './api/_lib/db/index.js';
import { desc, gte } from 'drizzle-orm';

async function main() {
    try {
        // Look at logs from the last 15 minutes
        const minutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const logs = await db.select()
            .from(systemLogs)
            .where(gte(systemLogs.createdAt, minutesAgo))
            .orderBy(desc(systemLogs.createdAt))
            .limit(15)
            .execute();
        
        console.log('--- RECENT LOGS ---');
        console.log(JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error('Error fetching logs:', err);
    }
    process.exit(0);
}

main();
