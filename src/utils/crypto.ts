// Simple XOR + Base64 obfuscation to prevent plaintext storage in localStorage
// Note: This deters casual inspection and automated plaintext scrapers, 
// but is not a replacement for a true backend proxy for absolute security.

const OBFS_SALT = "A1b2C3d4E5f6G7_product_album_secret_obfs";

export const obfuscateKey = (text: string): string => {
  if (!text) return text;
  try {
    const xored = Array.from(text).map((c, i) => {
      return String.fromCharCode(c.charCodeAt(0) ^ OBFS_SALT.charCodeAt(i % OBFS_SALT.length));
    }).join('');
    // Use encodeURIComponent to safely handle Unicode/special chars before base64
    return btoa(encodeURIComponent(xored));
  } catch (e) {
    console.error("Obfuscation failed");
    return text;
  }
};

export const deobfuscateKey = (text: string): string => {
  if (!text) return text;
  try {
    const decoded = decodeURIComponent(atob(text));
    return Array.from(decoded).map((c, i) => {
      return String.fromCharCode(c.charCodeAt(0) ^ OBFS_SALT.charCodeAt(i % OBFS_SALT.length));
    }).join('');
  } catch (e) {
    // If it fails to decrypt, it might be an older plaintext key
    return text;
  }
};
