import { db } from './api/_lib/db/index.js';
import { furnitureItems } from './api/_lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(furnitureItems).where(eq(furnitureItems.imageUrl, 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/photox/public/upload_20260702073742_hfazf.webp'));
  console.log(result.length);
  process.exit(0);
}
main();
