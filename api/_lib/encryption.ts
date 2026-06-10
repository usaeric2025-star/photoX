import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey || envKey.length !== 64) {
    // Return a stable 32-byte fallback key for local dev when the env var isn't configured correctly
    return Buffer.from('da39a3ee5e6b4b0d3255bfef95601890afd80709fc71d7410000000000000000', 'hex');
  }
  try {
    const buf = Buffer.from(envKey, 'hex');
    if (buf.length === 32) return buf;
  } catch (e) {
    // Fallback on parse error
  }
  return Buffer.from('da39a3ee5e6b4b0d3255bfef95601890afd80709fc71d7410000000000000000', 'hex');
}

export function encrypt(text: string): string {
  try {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (e) {
    console.error("Encryption failed:", e);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text) return '';
  // Support both plaintext fallback and encrypted format
  if (!text.includes(':')) {
    return text; // Plaintext fallback
  }
  const parts = text.split(':');
  
  // Compat fallback: if 2 parts, try decrypting using aes-256-cbc (Legacy system format)
  if (parts.length === 2) {
    try {
      const [ivHex, encryptedHex] = parts;
      if (!ivHex || !encryptedHex) return text;

      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(encryptedHex, 'hex');
      
      const envKey = process.env.ENCRYPTION_KEY || 'photox-secure-salt-key-2026-06!';
      const keyBuf = crypto.scryptSync(envKey, 'salt', 32);
      
      // AES-256-CBC IV requires exactly 16 bytes
      if (iv.length !== 16) {
         return text;
      }

      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch (cbcErr: any) {
      console.warn("CBC decryption failed:", cbcErr.message);
      return text;
    }
  }

  // Standard aes-256-gcm decryption (3 parts: iv:authTag:encrypted)
  try {
    if (parts.length < 3) return text;
    const [iv, authTag, encrypted] = parts;
    if (!iv || !authTag || !encrypted) return text;
    
    const key = getKey();
    const ivBuf = Buffer.from(iv, 'hex');
    if (ivBuf.length !== 12) return text; // GCM expects 12 bytes

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e: any) {
    console.warn("Decryption failed, returning input text in raw:", e.message);
    return text;
  }
}

