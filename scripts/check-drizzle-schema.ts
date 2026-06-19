
import { db, settings } from '../api/_lib/db/index.js';
import { getTableColumns } from 'drizzle-orm';

async function run() {
  const columns = getTableColumns(settings);
  console.log("SETTINGS COLUMNS IN DRIZZLE SCHEMA:", Object.keys(columns));
  process.exit(0);
}

run();
