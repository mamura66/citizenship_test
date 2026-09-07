/* Small HTTP helpers. Nothing here knows about citizenship or countries - keep it that way
   so the routes stay readable. */

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // API responses are per-user. A cache in front of this would be a data leak.
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });

export const fail = (status, code, message) => json({ error: code, message }, { status });

export const redirect = (location, extraHeaders = {}) =>
  new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store', ...extraHeaders } });

/** Reads one cookie. Workers gives us the raw header, so parse it ourselves. */
export function cookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** Set-Cookie for a first-party session. Secure + HttpOnly + Lax: the browser sends it on
 *  our own fetches and on top-level navigations back from Google, but never to third
 *  parties and never to page JavaScript. */
export function setCookie(name, value, { maxAge = 0, httpOnly = true } = {}) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${maxAge}`,
  ];
  if (httpOnly) bits.push('HttpOnly');
  return bits.join('; ');
}

export const clearCookie = (name) => `${name}=; Path=/; SameSite=Lax; Secure; HttpOnly; Max-Age=0`;

/** Body-changing requests must come from our own origin. SameSite=Lax already blocks
 *  cross-site form posts, but a same-site subdomain or a stray <form> should not be able
 *  to drive the API either, so require the Origin header to match the host we answered on. */
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function readJson(request, limit = 8 * 1024) {
  const text = await request.text();
  if (text.length > limit) throw new Error('body too large');
  try {
    const v = JSON.parse(text || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    throw new Error('invalid JSON');
  }
}
