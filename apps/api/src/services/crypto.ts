import crypto from 'node:crypto';
const ALGO = 'aes-256-gcm';
function key(raw: string) { return crypto.createHash('sha256').update(raw).digest(); }
export function encryptSecret(value: string, encryptionKey: string): string { const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv(ALGO,key(encryptionKey),iv); const enc=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]); const tag=cipher.getAuthTag(); return Buffer.concat([iv,tag,enc]).toString('base64'); }
export function decryptSecret(payload: string, encryptionKey: string): string { const b=Buffer.from(payload,'base64'); const iv=b.subarray(0,12); const tag=b.subarray(12,28); const enc=b.subarray(28); const decipher=crypto.createDecipheriv(ALGO,key(encryptionKey),iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(enc),decipher.final()]).toString('utf8'); }
