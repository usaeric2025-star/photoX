import { db } from '../api/_lib/db/index.js';
import { manufacturers } from '../api/_lib/db/schema.js';

async function main() {
    const data = await db.select().from(manufacturers);
    console.log(data.length, "manufacturers found");
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}
main();
