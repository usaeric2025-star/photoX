import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.migration" });

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function clean() {
  const reportPath = path.join("scripts/storage", "audit-report.json");
  const report = JSON.parse(await fs.readFile(reportPath, "utf-8"));
  
  const bucket = "photox-storage";
  let deleted = 0;

  for (const orphan of report.orphanList) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: `photox/public/${orphan}` }));
    deleted++;
    console.log(`Deleted orphan: ${orphan}`);
  }
  
  console.log(`Cleanup complete. Deleted: ${deleted}`);
}

clean();
