import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';

const SALT_KEY = 'tv_salt';
const VERIFY_KEY = 'tv_verify';
// Known plaintext encrypted with the derived key — used to verify the password on unlock.
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

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

// PBKDF2-SHA256 key derivation. 100k iterations per OWASP guidance.
// Synchronous — blocks the JS thread for ~200-500ms on device. Call after
// yielding to the event loop (setTimeout) so any loading indicator can render.
export function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, password, salt, { c: 100_000, dkLen: 32 });
}

// First-time private mode setup. Derives key, stores salt + verification blob
// in the device Keychain/Keystore. Returns the derived key for the session.
export async function setupPrivateMode(password: string): Promise<Uint8Array> {
  const salt = randomBytes(16);
  const key = deriveKey(password, salt);

  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(new TextEncoder().encode(VERIFY_MSG));
  const verifyBlob = concat(nonce, ciphertext);

  await SecureStore.setItemAsync(SALT_KEY, toHex(salt));
  await SecureStore.setItemAsync(VERIFY_KEY, toHex(verifyBlob));

  return key;
}

// Unlock: derive key from password, verify against stored blob.
// Returns the key on success, null on wrong password, 'no-setup' if
// SecureStore has been cleared (e.g. app reinstall).
export async function unlockWithPassword(
  password: string
): Promise<Uint8Array | null | 'no-setup'> {
  const saltHex = await SecureStore.getItemAsync(SALT_KEY);
  const verifyHex = await SecureStore.getItemAsync(VERIFY_KEY);
  if (!saltHex || !verifyHex) return 'no-setup';

  const salt = fromHex(saltHex);
  const key = deriveKey(password, salt);

  try {
    const blob = fromHex(verifyHex);
    const nonce = blob.slice(0, 12);
    const ciphertext = blob.slice(12);
    const cipher = gcm(key, nonce);
    const decrypted = new TextDecoder().decode(cipher.decrypt(ciphertext));
    if (decrypted !== VERIFY_MSG) return null;
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
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(new TextEncoder().encode(plaintext));
  return toHex(concat(nonce, ciphertext));
}

export function decryptField(key: Uint8Array, hexCiphertext: string): string {
  try {
    const blob = fromHex(hexCiphertext);
    const nonce = blob.slice(0, 12);
    const ciphertext = blob.slice(12);
    const cipher = gcm(key, nonce);
    return new TextDecoder().decode(cipher.decrypt(ciphertext));
  } catch {
    return '[encrypted]';
  }
}

// Convenience: returns a copy of a task with sensitive fields decrypted.
// If the task isn't encrypted or no key is in session, returns it unchanged.
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
