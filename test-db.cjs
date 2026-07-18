const postgres = require('postgres');
async function run() {
  const sql = postgres('postgres://postgres:password@127.0.0.1:5432/postgres', {
    connect_timeout: 2,
    max: 1,
    onconnect: async (sql) => {
      await sql`SET statement_timeout = 15000`;
    }
  });
  
  try {
    await sql`SELECT 1`;
  } catch (err) {
    console.log("Error:", err.code);
  } finally {
    await sql.end();
  }
}
run();
