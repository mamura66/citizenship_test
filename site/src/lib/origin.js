/* Where this site lives, according to configuration rather than according to the request.
 *
 * A password reset link must never be built from the request's own Host header. That is
 * the textbook way to leak a reset token: get the Worker to see a Host you control, and
 * the link in the victim's email points at your server instead of ours. The same argument
 * applies to the Google redirect URI, which has to match a registered value exactly.
 *
 * So: PUBLIC_ORIGIN wins when it is set, which it always is in production. The request's
 * own origin is the fallback, which is what makes `wrangler dev` on localhost work.
 */
export function publicOrigin(request, env) {
  if (env.PUBLIC_ORIGIN) return String(env.PUBLIC_ORIGIN).replace(/\/+$/, '');
  return new URL(request.url).origin;
}
