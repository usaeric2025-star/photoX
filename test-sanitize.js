import { sanitizePhotoPayload } from './api/_handlers/photos/sanitize.js';

const p = { categoryId: "", manufacturerId: "", description: "" };
console.log(sanitizePhotoPayload(p));
