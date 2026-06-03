import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.migration" });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function audit() {
  const { data: photos, error } = await supabase.from("furniture_items").select("image_url");
  if (error) throw error;

  const r2Files: Set<string> = new Set();
  const dbFiles: Set<string> = new Set();

  photos.forEach(p => {
    if (p.image_url?.includes("r2")) dbFiles.add(p.image_url.split("/").pop()!);
  });

  const bucket = "photox-storage";
  let continuationToken: string | undefined;
  
  do {
    const list = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "photox/public/", ContinuationToken: continuationToken }));
    list.Contents?.forEach(c => { if (c.Key) r2Files.add(c.Key.split("/").pop()!); });
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  const missing: string[] = [];
  const orphans: string[] = [];

  // 待校验：dbFiles 中的是否都在 r2Files 中
  dbFiles.forEach(f => { if (!r2Files.has(f)) missing.push(f); });
  r2Files.forEach(f => { if (!dbFiles.has(f)) orphans.push(f); });

  const report = { total: r2Files.size, missing: missing.length, orphans: orphans.length, missingList: missing, orphanList: orphans };
  await fs.writeFile(path.join("scripts/storage", "audit-report.json"), JSON.stringify(report, null, 2));
  console.log("Audit complete:", report);
}

audit();
