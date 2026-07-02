import { sanitizePhotoPayload } from './api/_handlers/photos/sanitize.ts';

console.log(sanitizePhotoPayload({ manufacturer_id: "" }));
console.log(sanitizePhotoPayload({ manufacturerId: "" }));
console.log(sanitizePhotoPayload({ category_id: "" }));
console.log(sanitizePhotoPayload({ categoryId: "" }));
console.log(sanitizePhotoPayload({ id: "abc", manufacturerId: "", categoryId: "", groupId: "" }));
