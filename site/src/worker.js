/* Prepare for Citizenship - the API in front of the static site.
 *
 * Static assets (the marketing site, the web app, the country content packs) are served
 * by Cloudflare before this code runs. Only the paths listed in `run_worker_first` in
 * wrangler.jsonc reach here: /api/* and the app page itself.
 *
 * WHAT IS ACTUALLY PROTECTED. The app page requires a session, so there is no way into
 * the product without an account - that is the product rule. The question content under
 * /content/ stays a public static file, because it is public information and pretending
 * otherwise would mean shipping a slower app for no security. The things worth protecting
 * are the ones a person could otherwise grant themselves: paid access, and the one free
 * practice test. Both live on the server.
 */

import { clearCookie, cookie, fail } from './lib/http.js';
import { getSession, getUserById } from './lib/store.js';
import { SESSION_COOKIE, login, logout, register } from './routes/auth.js';
import * as google from './routes/google.js';
import { config, me, readProgress, setCountry, writeProgress } from './routes/me.js';
import { confirmCheckout, startCheckout, webhook } from './routes/paddle.js';
import { checkToken, forgot, reset } from './routes/reset.js';

/* method + path -> handler. `auth: true` means the handler is only reached with a valid
   session, and is handed the user as ctx.user. */
const ROUTES = [
  ['POST', '/api/auth/register', register],
  ['POST', '/api/auth/login', login],
  ['POST', '/api/auth/logout', logout],
  ['POST', '/api/auth/forgot', forgot],
  ['GET', '/api/auth/reset-token', checkToken],
  ['POST', '/api/auth/reset', reset],
  ['GET', '/api/auth/google/start', google.start],
  ['GET', '/api/auth/google/callback', google.callback],
  ['GET', '/api/config', config],
  ['POST', '/api/paddle/webhook', webhook],

  ['GET', '/api/me', me, { auth: true }],
  ['POST', '/api/me/country', setCountry, { auth: true }],
  ['GET', '/api/progress', readProgress, { auth: true }],
  ['PUT', '/api/progress', writeProgress, { auth: true }],
  ['POST', '/api/checkout', startCheckout, { auth: true }],
  ['POST', '/api/checkout/confirm', confirmCheckout, { auth: true }],
];

/** Resolves the session cookie to a user, or null. A cookie that points at a session KV
 *  entry which has expired, or at a user who has been deleted, is treated as signed out. */
async function currentUser(request, env) {
  const token = cookie(request, SESSION_COOKIE);
  const session = await getSession(env, token);
  if (!session) return null;
  const user = await getUserById(env, session.uid);
  if (!user) return null;

  // A password reset stamps the account, and every session issued before that stamp stops
  // being accepted. This is how "reset my password" signs out whoever else had the old
  // one, without keeping an index of a user's sessions to go and delete.
  if (user.credentialsChangedAt && Number(session.at) < Number(user.credentialsChangedAt)) {
    return null;
  }
  return { user, session };
}

/** The one page behind the sign-in wall. Everything else about it is a static asset - we
 *  only decide whether the browser is allowed to have it. */
async function appPage(request, env) {
  const signedIn = await currentUser(request, env);
  if (!signedIn) {
    const headers = new Headers({ location: '/login?next=/app', 'cache-control': 'no-store' });
    // Clear a stale cookie on the way out, so an expired session does not cause a loop
    // between the app page and the sign-in page.
    if (cookie(request, SESSION_COOKIE)) headers.append('set-cookie', clearCookie(SESSION_COOKIE));
    return new Response(null, { status: 302, headers });
  }
  // '/app', not '/app.html': the asset router strips the extension and would answer a
  // request for the .html path with a 307 to this one, which the browser would follow
  // straight back into this handler.
  const res = await env.ASSETS.fetch(new Request(new URL('/app', request.url), request));
  // Signed-in HTML must not sit in a shared cache, and must be re-checked on back/forward
  // so signing out actually shows the sign-in page.
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // The apex is canonical: one hostname for cookies, for the Google redirect URI and
    // for Paddle's approved-domain list.
    if (url.hostname === 'www.prepareforcitizenship.com') {
      url.hostname = 'prepareforcitizenship.com';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/app' || url.pathname === '/app.html') return appPage(request, env);

    // The sign-in pages are static; the Worker sees them only to canonicalise the
    // hostname above, so hand them straight back to the asset router.
    if (['/login', '/login.html', '/signup', '/signup.html',
         '/forgot', '/forgot.html', '/reset', '/reset.html'].includes(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const match = ROUTES.find(([method, path]) => path === url.pathname && method === request.method);
    if (!match) {
      // A known path with the wrong verb deserves a 405, so a mistake in the front end is
      // obvious instead of looking like a missing route.
      const pathExists = ROUTES.some(([, path]) => path === url.pathname);
      if (pathExists) return fail(405, 'method_not_allowed', `${request.method} is not allowed here.`);
      if (url.pathname.startsWith('/api/')) return fail(404, 'not_found', 'No such endpoint.');
      return env.ASSETS.fetch(request);
    }

    const [, , handler, opts = {}] = match;
    let context = { ctx };
    if (opts.auth) {
      const signedIn = await currentUser(request, env);
      if (!signedIn) return fail(401, 'signed_out', 'Sign in to continue.');
      context = { ctx, user: signedIn.user, session: signedIn.session };
    }

    try {
      return await handler(request, env, context);
    } catch (err) {
      // Never echo an internal error to the browser; the Worker log has the detail.
      console.error(`${request.method} ${url.pathname} failed:`, err && err.stack ? err.stack : err);
      return fail(500, 'server_error', 'Something went wrong on our side. Try again.');
    }
  },
};
