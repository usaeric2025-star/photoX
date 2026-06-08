import { api } from './src/lib/api';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const base64Data = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
    const fallbackRes = await api['upload-direct'].$post({
        json: { base64Data, fileKey: "test.webp", contentType: 'image/webp' }
    });
    console.log("fallbackRes OK:", fallbackRes.ok);
    if (!fallbackRes.ok) {
        console.error(await fallbackRes.text());
    } else {
        console.log(await fallbackRes.json());
    }
  } catch (e) {
    console.error(e);
  }
}
test();
