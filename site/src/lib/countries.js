/* The server's allowlist of country codes.
 *
 * Deliberately not the same list as COUNTRIES in public/countries.js: the browser needs
 * names, flags and test titles to draw the picker, the server needs only to know which
 * codes may be written to an account.
 *
 * WHAT MAKES A COUNTRY AVAILABLE. Not a line in this file. A country is available when its
 * question pack exists as a static asset, and that is checked by asking the asset router
 * for the file. So the same fact - "is there a pack?" - answers the picker in the browser
 * and the allowlist on the server, and the two cannot disagree about a country the way two
 * hand-maintained lists eventually would.
 *
 * The country is locked to an account for good once written (see routes/me.js), so this is
 * the last gate before a decision nobody can take back. Getting it from the file rather
 * than from a flag is the point: an account can never be locked to a test we have no
 * questions for.
 */

/* code -> the pack that has to exist for that country to be selectable. A country absent
 * from this map is refused outright; a country present but with no file on disk is refused
 * until the file lands.
 *
 * Canada, the United Kingdom and Australia are absent. None of them publishes the question
 * pool the real test draws from: Canada publishes a study guide, the Life in the UK bank is
 * confidential Crown copyright, and Australia publishes a twenty-question practice sample
 * and says so. There is a pack for that Australian sample, and it declares its own licence
 * as pending review - so it is kept out of the website's content manifest as well as out of
 * this map. Two locks, on purpose. */
export const COUNTRY_PACKS = {
  us: '/content/us/civics-2025.json',
  de: '/content/de/einbuergerungstest.json',
  // Canada's pack is OUR practice questions, not a copy of an official pool - Canada does
  // not publish one. The pack declares `contentType: "authored-practice"` and carries the
  // non-affiliation wording the website shows with the questions.
  ca: '/content/ca/practice-questions.json',
  // Australia the same, and better licensed: Our Common Bond's testable section is CC BY
  // 4.0, so the facts are free for commercial use with attribution. The twenty official
  // SAMPLE questions in content/au/citizenship-practice.json are a different thing and
  // stay held back - sync-content.sh deletes them from the site because their own licence
  // review is unfinished. Two packs in one folder, one served and one not, on purpose.
  au: '/content/au/practice-questions.json',
  // Spain is here and its pack is not, deliberately: the CCSE questions are held back
  // pending a licence question, so there is no file and Spain is refused by the ordinary
  // "no pack" path. If the licence is cleared, the pack lands and Spain works.
  es: '/content/es/ccse.json',
};

/* A NOTE ON THE UNITED KINGDOM'S CODE, before somebody wastes an afternoon on it.
 *
 * Accounts store `uk`. That is what public/countries.js offers, what the sign-up form
 * posts, and what is already written on live accounts, so it is not changing. ISO 3166-1
 * says `GB`, which is why a content folder has appeared at apps/us-citizenship/content/gb/.
 *
 * If a UK pack ever exists, the entry here has to read '/content/gb/<file>' against the key
 * `uk` - the account code and the folder name are allowed to differ, and mapping them in
 * one place is cheaper than migrating every stored account.
 *
 * A UK pack IS now coming, but it will not be the official bank. That bank is confidential
 * Crown copyright and is published nowhere, so nobody has it - not even the official
 * publisher's own app, which says its questions are "based on the style and structure of
 * official questions". The UK pack will be our own questions, written from the official
 * handbook's facts, exactly as Canada's is. It is blocked only on buying the handbook. */

/* Assets do not change without a deploy, so the answer is worth keeping. The short TTL is
 * for `wrangler dev`, where a pack can appear under a running Worker - a permanent cache
 * would keep saying "not yet" for the rest of the session. */
const TTL_MS = 60_000;
const cache = new Map();

/** The hostname is irrelevant to the asset binding, which routes on the path. A fixed
 *  origin is used rather than the request's, so this cannot be influenced by a Host
 *  header. */
const ASSET_ORIGIN = 'https://assets.invalid';

async function packExists(env, path) {
  if (!env || !env.ASSETS) {
    // The binding is missing, which is a broken deployment, not an available country.
    // Failing closed means nobody can register; failing open would mean an account locked
    // to a test with no questions in it. The first is visible and fixable.
    console.error('ASSETS binding missing - no country can be offered');
    return false;
  }
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ready;
  let ready = false;
  try {
    const res = await env.ASSETS.fetch(new Request(new URL(path, ASSET_ORIGIN), { method: 'HEAD' }));
    ready = res.ok;
  } catch (err) {
    console.error(`could not check for ${path}:`, err && err.message ? err.message : err);
    ready = false;
  }
  cache.set(path, { ready, at: Date.now() });
  return ready;
}

/* Which countries are OFFERED, as opposed to which ones have questions.
 *
 * These are two different facts and both have to be true. A pack existing proves we can
 * teach a test; it does not mean we are ready to sell it, translate its support pages, or
 * answer its email. `COUNTRIES_OFFERED` is how that second decision is made - a
 * comma-separated list of codes, and unset means "every country with a pack".
 *
 * The important property: this can only ever REMOVE a country, never add one. Readiness is
 * still proved by the pack file being there, exactly as before, so no value of this var can
 * make the site offer a test it has no questions for. That was the whole reason readiness
 * stopped being a hand-edited flag, and it stays true.
 */
function isOffered(env, code) {
  const list = String((env && env.COUNTRIES_OFFERED) || '').trim();
  if (!list) return true;
  return list.toLowerCase().split(/[^a-z]+/).filter(Boolean).includes(code);
}

/** Whether an account may be created against, or locked to, this country code. */
export async function isReadyCountry(env, code) {
  const c = String(code || '').toLowerCase();
  const path = COUNTRY_PACKS[c];
  if (!path) return false;
  // Offered first: it is a cheap string check, and a country we are not offering should be
  // refused whether or not its pack happens to be deployed.
  if (!isOffered(env, c)) return false;
  return packExists(env, path);
}

/** The offered list as the browser needs to see it, or null when everything is offered. */
export function offeredCountryCodes(env) {
  const list = String((env && env.COUNTRIES_OFFERED) || '').trim();
  if (!list) return null;
  return list.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

/** Every code whose pack is actually there. Not used to gate anything - isReadyCountry is
 *  the gate - but useful to report the state of the world in one call. */
export async function readyCountryCodes(env) {
  const codes = Object.keys(COUNTRY_PACKS);
  const flags = await Promise.all(codes.map((c) => isReadyCountry(env, c)));
  return codes.filter((_, i) => flags[i]);
}
