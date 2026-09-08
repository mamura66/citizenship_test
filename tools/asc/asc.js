// Minimal App Store Connect API client.
//
// Signs a short-lived ES256 JWT locally. NO SECRETS LIVE HERE: the key path and ids
// come from the environment, and the .p8 itself never leaves the machine.
//
//   ASC_KEY_PATH=~/Downloads/AuthKey_XXXXXXXXXX.p8 \
//   ASC_KEY_ID=XXXXXXXXXX ASC_ISSUER_ID=<uuid> node tools/asc/<script>.js
//
// The key currently in use was created for RevenueCat and has limited rights: it can
// write metadata, upload screenshots and attach builds, but returns 403 on review
// submission details. A key with the App Manager role would lift that.
const crypto = require('crypto');
const fs = require('fs');
const b64u = (b) => Buffer.from(b).toString('base64url');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const h = { alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' };
  const p = { iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' };
  const si = `${b64u(JSON.stringify(h))}.${b64u(JSON.stringify(p))}`;
  const sig = crypto.sign('sha256', Buffer.from(si), {
    key: fs.readFileSync(process.env.ASC_KEY_PATH.replace(/^~/, process.env.HOME)),
    dsaEncoding: 'ieee-p1363',
  });
  return `${si}.${sig.toString('base64url')}`;
}
let JWT = token();

async function api(method, path, body, extraHeaders = {}) {
  const url = path.startsWith('http') ? path : 'https://api.appstoreconnect.apple.com' + path;
  // Three attempts on a transport failure ("fetch failed" with no HTTP status). Seen three
  // times in one afternoon from this machine; each one cost a manual retry, and one of them
  // landed between a delete and the reorder that depended on it. A non-2xx HTTP response is
  // NOT retried - that is Apple answering, and callers decide what it means.
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await once(method, url, body, extraHeaders);
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

async function once(method, url, body, extraHeaders) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${JWT}`,
      ...(body && !(body instanceof Buffer) ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    body: body ? (body instanceof Buffer ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, json, text };
}

module.exports = {
  APP_ID: '6808512010',
  api,
  get: (p) => api('GET', p),
  post: (p, b) => api('POST', p, b),
  patch: (p, b) => api('PATCH', p, b),
  del: (p) => api('DELETE', p),
  refresh: () => (JWT = token()),
};
