// AES-GCM encryption for stored OAuth tokens, and HMAC-signed OAuth state.
// Keys are derived from TOKEN_ENCRYPTION_KEY, which exists only in function secrets.

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

async function digest(label: string, secret: string): Promise<ArrayBuffer> {
  return await crypto.subtle.digest('SHA-256', enc.encode(`${label}:${secret}`));
}

async function aesKey(secret: string) {
  return await crypto.subtle.importKey('raw', await digest('aes', secret), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function hmacKey(secret: string) {
  return await crypto.subtle.importKey('raw', await digest('hmac', secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export const KEY_ID = 'v1';

export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), enc.encode(plaintext)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}

export async function decrypt(ciphertext: string, secret: string): Promise<string> {
  const bytes = unb64(ciphertext);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await aesKey(secret), bytes.slice(12));
  return dec.decode(pt);
}

export async function signState(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyState<T>(state: string, secret: string): Promise<T | null> {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    return JSON.parse(dec.decode(unb64url(body))) as T;
  } catch {
    return null;
  }
}
