import { db, groups } from '../api/_lib/db/index.js';
import { syncGroupCoversAndCount } from '../api/_lib/groups.js';

async function main() {
  const allGroups = await db.select({ id: groups.id }).from(groups);
  const groupIds = allGroups.map(g => g.id);
  console.log(`Syncing ${groupIds.length} groups...`);
  if (groupIds.length > 0) {
    await syncGroupCoversAndCount(groupIds);
  }
  console.log('Done!');
  process.exit(0);
}

main().catch(console.error);
