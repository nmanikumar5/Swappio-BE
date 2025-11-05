import crypto from 'crypto';
import { config } from '../config/env';

const ALGO = 'aes-256-gcm';

function getKey() {
    if (!config.encryptionKey) return null;
    // expect base64 encoded 32-byte key
    try {
        const buf = Buffer.from(config.encryptionKey, 'base64');
        if (buf.length !== 32) return null;
        return buf;
    } catch {
        return null;
    }
}

export function encryptText(plain: string) {
    const key = getKey();
    if (!key) throw new Error('Encryption key not configured');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptText(blob: string) {
    const key = getKey();
    if (!key) throw new Error('Encryption key not configured');
    const data = Buffer.from(blob, 'base64');
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}
