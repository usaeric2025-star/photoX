import postgres from 'postgres';
const connectionString = process.env.DATABASE_URL;
console.log("DB URL length:", connectionString?.length);
async function test() {
  const client = postgres(connectionString, { max: 1, connect_timeout: 5 });
  try {
    const start = Date.now();
    await client`SELECT 1`;
    console.log("Connected in", Date.now() - start, "ms");
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}
test();
