// Key derivation: Web Crypto PBKDF2-SHA256 (native, non-blocking, RN 0.71+).
// Symmetric encryption: tweetnacl secretbox (XSalsa20-Poly1305, CommonJS, sync).
import * as nacl from 'tweetnacl';
import * as SecureStore from 'expo-secure-store';

const SALT_KEY = 'tv_salt';
const VERIFY_KEY = 'tv_verify';
const VERIFY_MSG = 'task-void-v1';

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Derives a 32-byte key using PBKDF2-SHA256 via the Web Crypto API.
// Runs on the native thread — non-blocking even at 100k iterations.
async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  // .buffer on a Uint8Array is typed as ArrayBufferLike; .slice() returns ArrayBuffer.
  const pwBytes = new TextEncoder().encode(password);
  const pwBuffer = pwBytes.buffer.slice(pwBytes.byteOffset, pwBytes.byteOffset + pwBytes.byteLength) as ArrayBuffer;
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pwBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can get the raw bytes for tweetnacl
    ['encrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', cryptoKey);
  return new Uint8Array(raw);
}

export async function setupPrivateMode(password: string): Promise<Uint8Array> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  // Encrypt a known string; used to verify the password on future unlocks.
  const nonce = randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(new TextEncoder().encode(VERIFY_MSG), nonce, key);
  const verifyBlob = new Uint8Array(nonce.length + box.length);
  verifyBlob.set(nonce);
  verifyBlob.set(box, nonce.length);

  await SecureStore.setItemAsync(SALT_KEY, toHex(salt));
  await SecureStore.setItemAsync(VERIFY_KEY, toHex(verifyBlob));

  return key;
}

export async function unlockWithPassword(
  password: string
): Promise<Uint8Array | null | 'no-setup'> {
  const saltHex = await SecureStore.getItemAsync(SALT_KEY);
  const verifyHex = await SecureStore.getItemAsync(VERIFY_KEY);
  if (!saltHex || !verifyHex) return 'no-setup';

  const salt = fromHex(saltHex);
  const key = await deriveKey(password, salt);

  try {
    const blob = fromHex(verifyHex);
    const nonce = blob.slice(0, nacl.secretbox.nonceLength);
    const box = blob.slice(nacl.secretbox.nonceLength);
    const decrypted = nacl.secretbox.open(box, nonce, key);
    if (!decrypted) return null;
    if (new TextDecoder().decode(decrypted) !== VERIFY_MSG) return null;
    return key;
  } catch {
    return null;
  }
}

export async function clearPrivateModeKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(SALT_KEY);
  await SecureStore.deleteItemAsync(VERIFY_KEY);
}

export function encryptField(key: Uint8Array, plaintext: string): string {
  const nonce = randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(new TextEncoder().encode(plaintext), nonce, key);
  const blob = new Uint8Array(nonce.length + box.length);
  blob.set(nonce);
  blob.set(box, nonce.length);
  return toHex(blob);
}

export function decryptField(key: Uint8Array, hexCiphertext: string): string {
  try {
    const blob = fromHex(hexCiphertext);
    const nonce = blob.slice(0, nacl.secretbox.nonceLength);
    const box = blob.slice(nacl.secretbox.nonceLength);
    const decrypted = nacl.secretbox.open(box, nonce, key);
    if (!decrypted) return '[encrypted]';
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[encrypted]';
  }
}

export function decryptTaskFields<
  T extends {
    encrypted: number;
    title: string;
    description: string | null;
    keywords: string | null;
    archive_notes: string | null;
  },
>(task: T, key: Uint8Array | null): T {
  if (!task.encrypted || !key) return task;
  return {
    ...task,
    title: decryptField(key, task.title),
    description: task.description ? decryptField(key, task.description) : null,
    keywords: task.keywords ? decryptField(key, task.keywords) : null,
    archive_notes: task.archive_notes ? decryptField(key, task.archive_notes) : null,
  };
}
