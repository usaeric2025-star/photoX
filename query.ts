import { db } from './api/_lib/db/index.js';
import { furnitureItems } from './api/_lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(furnitureItems).where(eq(furnitureItems.id, '18a949ed-7cfa-411d-87f7-c642933eade3'));
  console.log(result);
  process.exit(0);
}
main();
