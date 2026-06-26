import fs from 'fs';
const file = 'supabase/migrations/0005_outgoing_loners.sql';
let sql = fs.readFileSync(file, 'utf8');
sql = sql.replace(/ADD COLUMN "/g, 'ADD COLUMN IF NOT EXISTS "');
sql = sql.replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');
sql = sql.replace(/DROP COLUMN "/g, 'DROP COLUMN IF EXISTS "');
fs.writeFileSync(file, sql);
