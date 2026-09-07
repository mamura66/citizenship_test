/* Who is allowed to see the analytics, and what everybody else gets.
 *
 * The owner is named in ANALYTICS_OWNER_EMAIL (wrangler.jsonc), not in this file. An
 * email address in source is a value that has to be found and changed in a code edit -
 * and, on a repo that goes to a build service, a personal address published for no reason.
 * A comma-separated list is accepted so a second person can be added without a code
 * change. Unset means nobody, which is the right default: a misconfigured deploy should
 * expose the dashboard to no one rather than to the first person who signs in.
 */

/** True when the session behind this request belongs to the owner. */
export function isOwner(env, user) {
  if (!user || !user.email) return false;
  const allowed = String((env && env.ANALYTICS_OWNER_EMAIL) || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  return allowed.includes(String(user.email).toLowerCase());
}

/**
 * The response for everybody who is not the owner.
 *
 * 404, and identically for "signed out", "signed in as somebody else" and "no such page".
 * A 403 would confirm to any signed-in visitor that an owner-only dashboard exists at
 * that URL and invite them to go looking for the API behind it; a 404 says nothing. The
 * path is also absent from robots.txt and sitemap.xml on purpose - listing it to say
 * "don't index this" would publish the address it is meant to keep quiet.
 *
 * It serves the site's own 404 page, so it is indistinguishable from a genuine miss
 * rather than a suspiciously bare "Not found".
 */
export async function notFound(request, env) {
  const headers = { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' };
  try {
    const res = await env.ASSETS.fetch(new Request(new URL('/404', request.url), { method: 'GET' }));
    if (res.ok) {
      const out = new Headers(res.headers);
      out.set('cache-control', 'no-store');
      return new Response(res.body, { status: 404, headers: out });
    }
  } catch {
    // The asset binding is not something to depend on for a refusal.
  }
  return new Response('Not found', { status: 404, headers });
}
