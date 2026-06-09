import { getSupabaseAdmin } from "../supabase.js";
import { getR2Client } from "../storage.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getServerEnv } from "../../shared/envSchema.js";

const serverEnv = getServerEnv(process.env);

export function normalizeUrl(u: string) { 
    return u.toLowerCase().trim().split('?')[0].replace(/\/$/, ''); 
}

export async function runStorageAudit() {
    const supabase = await getSupabaseAdmin();
    const r2 = await getR2Client();
    const bucket = serverEnv.R2_BUCKET_NAME!;
    const publicUrlPrefix = (serverEnv.R2_PUBLIC_URL_PREFIX || "").replace(/\/$/, '');

    const { data: dbPhotos } = await supabase
        .from("furniture_items")
        .select("id, image_url, name")
        .not("image_url", "is", null);

    const dbRecords = (dbPhotos || []).map(p => ({
        id: p.id,
        name: p.name,
        url: p.image_url,
        normalized: normalizeUrl(p.image_url)
    }));

    const dbNormalizedSet = new Set(dbRecords.map(r => r.normalized));

    const r2KeysSet = new Set<string>();
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: "photox/public/",
            ContinuationToken: continuationToken
        });
        const response = await r2.send(listCommand);
        
        (response.Contents || []).forEach(obj => {
            const key = obj.Key!;
            const isThumb = /thumb|temp|thumbnail|_t\.webp/i.test(key);
            if (!isThumb) {
                r2KeysSet.add(key);
            }
        });
        
        isTruncated = response.IsTruncated || false;
        continuationToken = response.NextContinuationToken;
    }

    const orphans: any[] = []; 
    const ghosts: any[] = [];  
    const healthy: any[] = []; 

    r2KeysSet.forEach(key => {
        const publicUrl = publicUrlPrefix.startsWith('http') 
          ? `${publicUrlPrefix}/${key}`
          : `https://${publicUrlPrefix}/${key}`;
        
        if (!dbNormalizedSet.has(normalizeUrl(publicUrl))) {
            orphans.push({ key, url: publicUrl });
        }
    });

    dbRecords.forEach(record => {
        const urlObj = new URL(record.url);
        const key = urlObj.pathname.replace(/^\//, '');
        
        if (r2KeysSet.has(key)) {
            healthy.push(record);
        } else {
            ghosts.push(record);
        }
    });

    return { healthy, ghosts, orphans };
}
