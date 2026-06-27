import { db } from '../api/_lib/db/index.js';
import { maintenanceJobs } from '../api/_lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
    const jobs = await db.select().from(maintenanceJobs);
    console.log(JSON.stringify(jobs, null, 2));
    process.exit(0);
}
main();
