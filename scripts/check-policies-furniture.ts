import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const policies = await sql`
    SELECT pol.polname, pol.polcmd, pol.polroles, pol.polqual, pol.polwithcheck
    FROM pg_policy pol
    JOIN pg_class cl ON pol.polrelid = cl.oid
    WHERE cl.relname = 'furniture_items';
  `;
  console.log('Policies on furniture_items:', policies);
  await sql.end();
}
run();
