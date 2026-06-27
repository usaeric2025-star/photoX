import 'dotenv/config';
import { db, systemLogs } from './api/_lib/db/index.js';

async function testLog() {
  try {
    const [log] = await db.insert(systemLogs).values({
      message: 'Test log from agent',
      level: 'info',
      operation: 'test_insert',
      createdAt: new Date()
    }).returning();
    console.log('Inserted log:', log);
  } catch (err) {
    console.error('Failed to insert test log:', err);
  }
}

testLog();
