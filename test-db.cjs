const postgres = require('postgres');
async function run() {
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@127.0.0.1:5432/postgres';
  console.log("Connecting to:", dbUrl.replace(/:([^:@]+)@/, ':****@'));
  const sql = postgres(dbUrl, {
    connect_timeout: 10,
    max: 1,
    onconnect: async (sql) => {
      await sql`SET statement_timeout = 15000`;
    }
  });
  
  try {
    const res = await sql`SELECT 1 as connected`;
    console.log("Connection successful! Result:", res);
  } catch (err) {
    console.log("Error:", err);
  } finally {
    await sql.end();
  }
}
run();
