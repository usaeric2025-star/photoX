import { app } from "./api/app.js";
import { getSupabaseAdmin } from "./api/_lib/supabase.js";

async function main() {
    const res = await app.request('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            error_message: "Test error please ignore",
            context: "Test script"
        })
    });
    console.log("Response status:", res.status);
    console.log("Response body:", await res.text());
}
main();
