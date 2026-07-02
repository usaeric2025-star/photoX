import { db } from './api/_lib/db/index.js';
import { furnitureItems } from './api/_lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(furnitureItems).where(eq(furnitureItems.groupId, '31f07cf2-e1e3-40cc-958e-118e9ed8a818'));
  console.log(result.map(r => ({ id: r.id, isCover: r.isGroupCover })));
  process.exit(0);
}
main();
