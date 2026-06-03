import sizeOf from "image-size";

export interface PhotoBackfillCandidate {
  id: string;
  name: string;
  name_en?: string;
  name_ms?: string;
  dimensions?: any;
  description?: string;
  description_translations?: any;
  image_url: string;
  image_hash: string;
}

export async function processBackfillBatch(
  supabase: any,
  apiKey: string | undefined,
  limit: number = 5
): Promise<{
  success: boolean;
  totalRemaining: number;
  processed: number;
  results: any[];
}> {
  // 1. Fetch all records with valid image_url and image_hash to see what remains to be backfilled.
  const { data: allPhotos, error: fetchError } = await supabase
    .from("furniture_items")
    .select("id, name, name_en, name_ms, dimensions, description, description_translations, image_url, image_hash")
    .not("image_url", "is", null)
    .neq("image_url", "")
    .not("image_hash", "is", null)
    .neq("image_hash", "");

  if (fetchError) {
    throw fetchError;
  }

  // 2. Filter in JS for accurate eligibility
  const eligible = (allPhotos || []).filter((photo: any) => {
    const needsDims = !photo.dimensions || !Array.isArray(photo.dimensions) || photo.dimensions.length === 0;
    const needsNames = !photo.name_en || photo.name_en === "" || !photo.name_ms || photo.name_ms === "" || !photo.name || photo.name === "" || photo.name === "图片";
    
    const hasDesc = photo.description && photo.description.trim() !== "";
    const hasTrans = photo.description_translations && typeof photo.description_translations === 'object';
    const needsDescTrans = hasDesc && (!hasTrans || !photo.description_translations.en || !photo.description_translations.ms);
    
    return needsDims || needsNames || needsDescTrans;
  });

  const totalRemaining = eligible.length;
  if (totalRemaining === 0) {
    return {
      success: true,
      totalRemaining: 0,
      processed: 0,
      results: []
    };
  }

  // Slice the current batch
  const batchToProcess = eligible.slice(0, limit);
  const results: any[] = [];

  for (const photo of batchToProcess) {
    try {
      const updates: any = {};
      let width = 0;
      let height = 0;
      let sizeExtracted = false;

      // Check if we need to fetch dimensions (width/height)
      const currentDims = Array.isArray(photo.dimensions) ? photo.dimensions : [];
      if (currentDims.length === 0) {
        // Download image binary from R2 / Worker url
        const res = await fetch(photo.image_url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          try {
            const size = sizeOf(buffer);
            if (size.width && size.height) {
              width = size.width;
              height = size.height;
              sizeExtracted = true;
            }
          } catch (e: any) {
            console.error(`[Backfill] Failed to parse image-size for ${photo.id}:`, e.message);
          }
        } else {
          console.error(`[Backfill] Failed to fetch image binary for ${photo.id}: status ${res.status}`);
        }
      } else {
        // Dimensions already exist, extract width & height
        const dim = currentDims[0];
        if (dim && dim.width && dim.height) {
          width = dim.width;
          height = dim.height;
          sizeExtracted = true;
        }
      }

      // Canonical Naming & Translation Fill
      if (sizeExtracted) {
        if (currentDims.length === 0) {
          updates.dimensions = [
            {
              label: `${width}x${height} 图片`,
              width,
              height,
              length: 0,
              unit: "cm",
              is_ai_estimated: false
            }
          ];
        }

        const canonicalName = `${width}x${height} 图片`;
        if (!photo.name || photo.name === "" || photo.name === "图片") {
          updates.name = canonicalName;
        }

        if (!photo.name_en || photo.name_en === "") {
          updates.name_en = `${width}x${height} Image`;
        }

        if (!photo.name_ms || photo.name_ms === "") {
          updates.name_ms = `Gambar ${width}x${height}`;
        }
      }

      // Translate description if missing
      const hasDesc = photo.description && photo.description.trim() !== "";
      const hasTrans = photo.description_translations && typeof photo.description_translations === 'object';
      const needsDescTrans = hasDesc && (!hasTrans || !photo.description_translations.en || !photo.description_translations.ms);

      if (needsDescTrans && apiKey) {
        try {
          const promptText = `Translate this product description into English and Bahasa Melayu (Malay).
Input: "${photo.description}"

Your response MUST match this exact JSON schema:
{
  "en": "translated english description",
  "ms": "translated malay description"
}`;
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "X-Title": "PhotoX AI"
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: promptText }],
              response_format: { type: "json_object" },
              max_tokens: 1000
            })
          });

          if (response.ok) {
            const resData = await response.json();
            const content = resData.choices?.[0]?.message?.content || JSON.stringify(resData);
            
            let parsedTrans: any = null;
            try {
              const match = content.match(/\{[\s\S]*\}/);
              parsedTrans = JSON.parse(match ? match[0] : content);
            } catch (_) {}

            if (parsedTrans && (parsedTrans.en || parsedTrans.ms)) {
              updates.description_translations = {
                zh: photo.description || '',
                en: parsedTrans.en || photo.description_translations?.en || '',
                ms: parsedTrans.ms || photo.description_translations?.ms || ''
              };
            }
          }
        } catch (err: any) {
          console.error(`[Backfill] Translation failed for ${photo.id}:`, err.message);
        }
      }

      // Sanitization: Only allow allowed fields to be updated
      const allowedFields = ['dimensions', 'name', 'name_en', 'name_ms', 'description_translations'];
      const sanitizedUpdates: any = {};
      for (const key in updates) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      }

      // Perform update if any fields changed
      if (Object.keys(sanitizedUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("furniture_items")
          .update(sanitizedUpdates)
          .eq("id", photo.id);

        if (updateError) throw updateError;
        results.push({
          id: photo.id,
          name: sanitizedUpdates.name || photo.name,
          status: "success",
          details: Object.keys(sanitizedUpdates)
        });
      } else {
        results.push({
          id: photo.id,
          name: photo.name,
          status: "skipped"
        });
      }
    } catch (err: any) {
      console.error(`[Backfill] Error processing photo ${photo.id}:`, err);
      results.push({
        id: photo.id,
        name: photo.name,
        status: "failed",
        error: err.message
      });
    }
  }

  return {
    success: true,
    totalRemaining: Math.max(0, totalRemaining - batchToProcess.length),
    processed: batchToProcess.length,
    results
  };
}
