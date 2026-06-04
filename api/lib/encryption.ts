import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    // Return a stable 32-byte fallback key for local dev when the env var isn't configured
    return Buffer.from('da39a3ee5e6b4b0d3255bfef95601890afd80709fc71d7410000000000000000', 'hex');
  }
  return Buffer.from(envKey, 'hex');
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!text) return '';
  // Support both plaintext fallback and encrypted format
  if (!text.includes(':')) {
    return text; // Plaintext fallback
  }
  try {
    const [iv, authTag, encrypted] = text.split(':');
    if (!iv || !authTag || !encrypted) return text;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e: any) {
    console.warn("Decryption failed, returning input text in raw:", e.message);
    return text;
  }
}

