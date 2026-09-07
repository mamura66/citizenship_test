/* Password hashing, tokens and constant-time comparison, all on WebCrypto - the Workers
   runtime has no Node crypto and no native bcrypt/argon2, so PBKDF2-SHA256 is the
   strongest primitive actually available here. */

const enc = new TextEncoder();

const b64u = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const unb64u = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export { b64u, unb64u };

/** URL-safe random token. 32 bytes = 256 bits, which is what session ids and OAuth state
 *  need to be unguessable. */
export const token = (bytes = 32) => b64u(crypto.getRandomValues(new Uint8Array(bytes)));

/* The Workers runtime refuses any PBKDF2 call above 100,000 iterations outright -
   "iteration counts above 100000 are not supported" - so a single call cannot reach the
   work factor OWASP asks for. Chaining does: each round feeds the previous round's output
   back in as the password, so six rounds of 100,000 costs an attacker the same 600,000
   HMAC-SHA256 operations as one 600,000-iteration call would have.

   Miniflare does not enforce the cap, so this only failed in production. The iteration
   count and the round count both travel with the hash, so either can be raised later
   without locking anyone out. */
const ITERATIONS = 100_000;
const ROUNDS = 6;

async function deriveOnce(passwordBytes, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  );
}

async function pbkdf2(password, salt, iterations, rounds) {
  let bits = await deriveOnce(enc.encode(password), salt, iterations);
  for (let i = 1; i < rounds; i++) bits = await deriveOnce(bits, salt, iterations);
  return bits;
}

/** Stored shape: pbkdf2$sha256$<iterations>x<rounds>$<salt>$<hash>. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS, ROUNDS);
  return `pbkdf2$sha256$${ITERATIONS}x${ROUNDS}$${b64u(salt)}$${b64u(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, algo, work, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || algo !== 'sha256') return false;

  // "100000x6" is the current shape; a bare "100000" is the single-round form, kept so a
  // hash written by an older build still verifies.
  const [iterText, roundText = '1'] = String(work).split('x');
  const iterations = Number(iterText);
  const rounds = Number(roundText);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > 100_000) return false;
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) return false;

  const got = await pbkdf2(password, unb64u(salt), iterations, rounds);
  return timingSafeEqual(got, unb64u(hash));
}

/** Compares without leaking where the first difference is. */
export function timingSafeEqual(a, b) {
  const x = a instanceof Uint8Array ? a : enc.encode(String(a));
  const y = b instanceof Uint8Array ? b : enc.encode(String(b));
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}
