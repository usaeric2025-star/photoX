import { getSupabaseAdmin } from "../supabase.js";
import { getR2Client } from "../storage.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getServerEnv } from "../../_shared/envSchema.js";

const serverEnv = getServerEnv(process.env);

export function normalizeUrl(u: string) { 
    return u.toLowerCase().trim().split('?')[0].replace(/\/$/, ''); 
}

export async function runStorageAudit() {
    const supabase = await getSupabaseAdmin();
    const r2 = await getR2Client();
    const bucket = serverEnv.R2_BUCKET_NAME!;
    const publicUrlPrefixRaw = serverEnv.R2_PUBLIC_URL_PREFIX || "";
    const publicUrlPrefix = publicUrlPrefixRaw.replace(/\/$/, '');
    const isPrefixSsl = publicUrlPrefix.startsWith('http');

    const startTime = Date.now();
    const MAX_RUN_TIME = 7500; // 7.5 seconds limit

    const { data: dbPhotos } = await supabase
        .from("furniture_items")
        .select("id, image_url, name")
        .not("image_url", "is", null);

    const dbRecords = (dbPhotos || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        url: p.image_url,
        normalized: normalizeUrl(p.image_url)
    }));

    const dbNormalizedSet = new Set(dbRecords.map((r: any) => r.normalized));

    const r2KeysSet = new Set<string>();
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated && (Date.now() - startTime < MAX_RUN_TIME)) {
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: "photox/public/",
            ContinuationToken: continuationToken,
            MaxKeys: 1000
        });
        
        // Add abort signal to prevent hanging
        const response = await r2.send(listCommand, { abortSignal: AbortSignal.timeout(3000) });
        
        if (response.Contents) {
            for (const obj of response.Contents) {
                const key = obj.Key!;
                // Fast regex check
                if (!/thumb|temp|thumbnail|_t\.webp/i.test(key)) {
                    r2KeysSet.add(key);
                }
            }
        }
        
        isTruncated = response.IsTruncated || false;
        continuationToken = response.NextContinuationToken;
        pagesProcessed++;
    }

    interface OrphanFile {
        key: string;
        url: string;
    }

    interface DbRecord {
        id: string;
        name: string;
        url: string;
        normalized: string;
    }

    const orphans: OrphanFile[] = []; 
    const ghosts: DbRecord[] = [];  
    const healthy: DbRecord[] = []; 

    // Use pre-constructed string template for performance
    r2KeysSet.forEach(key => {
        const publicUrl = isPrefixSsl 
          ? `${publicUrlPrefix}/${key}`
          : `https://${publicUrlPrefix}/${key}`;
        
        if (!dbNormalizedSet.has(normalizeUrl(publicUrl))) {
            orphans.push({ key, url: publicUrl });
        }
    });

    dbRecords.forEach((record: any) => {
        try {
            const urlObj = new URL(record.url);
            // Normalize path for lookup
            const key = urlObj.pathname.replace(/^\//, '');
            // Some keys might include the photox/public/ prefix or not depending on URL structure
            // We check both for robustness
            if (r2KeysSet.has(key) || r2KeysSet.has(`photox/public/${key}`)) {
                healthy.push(record);
            } else {
                ghosts.push(record);
            }
        } catch (e) {
            ghosts.push(record);
        }
    });

    return { healthy, ghosts, orphans, truncated: isTruncated };
}
