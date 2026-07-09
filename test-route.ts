import { db, aiAuditLogs, systemLogs, furnitureItems, photoTags } from './api/_lib/db/index.js';
import { eq, desc, sql } from 'drizzle-orm';

async function main() {
  const photoId = '23c6595a-6a3e-4237-96c7-67f6e9d2d3f3';
  try {
    let auditLog = null;
    if (!photoId.startsWith('temp-')) {
        auditLog = await db.query.aiAuditLogs.findFirst({
            where: eq(aiAuditLogs.photoId, photoId),
            orderBy: [desc(aiAuditLogs.createdAt)]
        });
    }

    if (!auditLog) {
        const fallbackLogs = await db.select()
            .from(aiAuditLogs)
            .where(sql`cleaned_output->>'_failedConstraintPhotoId' = ${photoId}`)
            .orderBy(desc(aiAuditLogs.createdAt))
            .limit(1);

        if (fallbackLogs && fallbackLogs.length > 0) {
            auditLog = fallbackLogs[0] as typeof aiAuditLogs.$inferSelect;
        }
    }

    if (auditLog) {
        let rawResult = '';
        
        if (auditLog.rawOutput) {
            rawResult = typeof auditLog.rawOutput === 'object' 
                ? JSON.stringify(auditLog.rawOutput, null, 2)
                : String(auditLog.rawOutput);
        }
        
        if (!rawResult && auditLog.cleanedOutput) {
            rawResult = typeof auditLog.cleanedOutput === 'object' 
                ? JSON.stringify(auditLog.cleanedOutput, null, 2)
                : String(auditLog.cleanedOutput);
        }
        
        console.log("Found auditLog:", rawResult.substring(0, 50));
        return;
    }
    console.log("No audit log found");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
main().catch(console.error);
