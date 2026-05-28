# Diagnostic Report: Thumbnail Loading Failure

## 🔍 Phenomena
- Admin Gallery items occasionally show original high-res images instead of thumbnails.
- Network tab shows 404s on some `.webp` requests with `width=` parameters.

## 🛠️ Root Cause
- `PHOTO_SELECT_FIELDS` was missing `thumbnail_sm_url` and `thumbnail_md_url`.
- `ContractedImage` was appending Cloudflare resize parameters to Supabase/other non-R2 URLs.

## 🩹 Fix Path
1. Update `PHOTO_SELECT_FIELDS` to include all thumbnail variants.
2. Implement `resolveImageUrl` with domain-aware logic to prevent incorrect parameter injection.
3. Add `Select Field Coverage Probe` to prevent future regressions.
