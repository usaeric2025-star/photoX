import fs from 'fs';
const snapshot = JSON.parse(fs.readFileSync('./supabase/migrations/meta/0004_snapshot.json', 'utf8'));

for (const table of Object.values(snapshot.tables)) {
  for (const col of Object.values(table.columns)) {
    console.log(`Table ${table.name}, Column ${col.name}: ${col.type}`);
  }
}
