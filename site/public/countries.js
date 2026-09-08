/* The country list, shared by the sign-up page, the app and the home page.
 *
 * One list in one file, because it is used in three places for three reasons: the sign-up
 * form needs it to build the dropdown where a person locks their country in, the app needs
 * it to know which content pack to load and what to call it on screen, and the home page
 * needs it to say honestly which countries are ready.
 *
 * READINESS IS NOT WRITTEN DOWN HERE. `ready` is not a field anyone edits - it is decided
 * at load time by asking whether the country's content pack actually exists. A country
 * appears the moment its pack lands under /content/<code>/ and never a minute before, so
 * there is no way for this file to promise a test we cannot serve. That was the failure
 * worth designing out: a row saying `ready: true` is a claim, and a claim can be wrong.
 *
 * Adding a country is therefore two things and no new screens: a row here naming the pack
 * file, and the same code in the server's allowlist (site/src/lib/countries.js) so an
 * account may be created against it. Both check the file for themselves.
 *
 * `language` is the language the country's own test is set in, and therefore the language
 * the app speaks to that person. The pack's own `language` field wins if it has one - the
 * content is the source of truth, here as everywhere.
 */

const COUNTRIES = [
  {
    code: 'us',
    name: 'United States',
    // The form that reads correctly inside a sentence. The app takes its country names
    // from strings.js so it can say "Vereinigte Staaten"; the marketing site is English
    // only and takes them from here rather than loading the whole string table for one
    // sentence.
    prose: 'the United States',
    test: 'USCIS civics test',
    language: 'en',
    // Two live versions; readiness follows the first file that exists.
    versions: [
      { id: '2025', file: 'civics-2025.json', label: '2025 test' },
      { id: '2008', file: 'civics-2008.json', label: '2008 test' },
    ],
    flag: `<svg viewBox="0 0 19 10" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
      <rect width="19" height="10" fill="#fff"/>
      ${[0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${i * 10 / 13}" width="19" height="${10 / 13}" fill="#B31942"/>`).join('')}
      <rect width="7.6" height="${10 * 7 / 13}" fill="#0A3161"/>
    </svg>`,
  },
  {
    code: 'de',
    name: 'Germany',
    // The official name of the test, in German, because that is what it is called on the
    // letter telling somebody to sit it.
    test: 'Einbürgerungstest',
    language: 'de',
    versions: [
      { id: 'ebt', file: 'einbuergerungstest.json', label: 'Einbürgerungstest' },
    ],
    flag: `<svg viewBox="0 0 19 10" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
      <rect width="19" height="3.334" y="0" fill="#000"/>
      <rect width="19" height="3.333" y="3.334" fill="#DD0000"/>
      <rect width="19" height="3.333" y="6.667" fill="#FFCE00"/>
    </svg>`,
  },
  {
    code: 'es',
    name: 'Spain',
    /* Listed, and not ready. The CCSE questions have been extracted from the Instituto
     * Cervantes manual, but the terms on the site that publishes it withhold reproduction
     * and redistribution, so the pack is held outside apps/ pending a licence question.
     * There is therefore no file at /content/es/ccse.json and Spain is not selectable -
     * which is the normal "no pack yet" path, not a special case. If the licence is
     * cleared the pack lands and Spain appears with no code change. */
    // Instituto Cervantes calls it the CCSE - "prueba de conocimientos constitucionales y
    // socioculturales de España".
    test: 'Prueba CCSE',
    language: 'es',
    versions: [
      { id: 'ccse', file: 'ccse.json', label: 'CCSE' },
    ],
    flag: `<svg viewBox="0 0 19 10" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
      <rect width="19" height="10" fill="#AA151B"/>
      <rect width="19" height="5" y="2.5" fill="#F1BF00"/>
    </svg>`,
  },

  /* Listed, and deliberately without a pack file. With no `versions` there is no file to
   * look for, so readiness can never come out true by accident.
   *
   * Canada publishes a study guide but not its questions. The Life in the UK question bank
   * is confidential Crown copyright and will not be published. Australia publishes a
   * twenty-question practice sample and says plainly that the real pool is not published. */
  { code: 'ca', name: 'Canada', test: 'Canadian citizenship test', language: 'en',
    versions: [{ id: 'practice', file: 'practice-questions.json', label: 'Practice questions' }], flag: `<svg viewBox="0 0 19 10" style="width:100%;height:100%;display:block"><rect width="19" height="10" fill="#fff"/><rect width="4.75" height="10" fill="#D80621"/><rect x="14.25" width="4.75" height="10" fill="#D80621"/></svg>` },
  { code: 'uk', name: 'United Kingdom', prose: 'the United Kingdom', test: 'Life in the UK test', language: 'en', versions: [], flag: `<svg viewBox="0 0 19 10" style="width:100%;height:100%;display:block"><rect width="19" height="10" fill="#012169"/><path d="M0 0l19 10M19 0L0 10" stroke="#fff" stroke-width="2"/><path d="M9.5 0v10M0 5h19" stroke="#fff" stroke-width="3"/><path d="M9.5 0v10M0 5h19" stroke="#C8102E" stroke-width="1.8"/></svg>` },
  /* Australia's practice questions HAVE been extracted, and are synced - but the pack
   * declares `licence.reviewStatus: "pending-legal-review"`, so tools/sync-content.sh keeps
   * it out of the manifest and no `versions` entry is declared here either. Two deliberate
   * steps to make Australia selectable, which is the right number for a country whose
   * published material is a twenty-question practice sample rather than the real pool. */
  { code: 'au', name: 'Australia', test: 'Australian citizenship test', language: 'en', versions: [], flag: `<svg viewBox="0 0 19 10" style="width:100%;height:100%;display:block"><rect width="19" height="10" fill="#00008B"/><rect width="9.5" height="5" fill="#012169"/><path d="M0 0l9.5 5M9.5 0L0 5" stroke="#fff" stroke-width="1"/></svg>` },
];

/** Where a country's pack lives. Null when the country has no pack declared at all, which
 *  is how "not planned" is expressed - there is nothing to look for. */
function packUrl(country) {
  const v = (country.versions || [])[0];
  return v ? `/content/${country.code}/${v.file}` : null;
}

/* HOW THE PACKS ARE FOUND.
 *
 * First choice is the manifest that tools/sync-content.sh writes when it copies the packs
 * across: one request, always a 200, and it lists exactly the files that were synced.
 *
 * The fallback is to ask for each pack directly with a HEAD. That was the first
 * implementation and it worked, but it costs one request per candidate country and every
 * country without a pack logs a 404 in the console on every page load. A red line in
 * devtools that is not a bug is worse than useless: it trains everybody to ignore the
 * console, and it forces every "no failed requests" test to carry an exception list, which
 * is how a real failure eventually gets hidden.
 *
 * The fallback stays because a missing manifest must not be able to empty the country
 * picker on a live site. And the server never trusts either one: it checks the pack file
 * itself before writing a country to an account (site/src/lib/countries.js), so the worst
 * a stale manifest can do is offer a country the server then refuses - not lock somebody
 * to a test we have no questions for.
 */
const MANIFEST_URL = '/content/packs.json';

async function readManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.packs && typeof data.packs === 'object' ? data.packs : null;
  } catch {
    return null;
  }
}

/** Does the pack actually exist? A HEAD is enough - we only need to know the file is
 *  there, and downloading a 30 KB question pool to find out would be paid for on every
 *  page load. /content/ is served by the CDN and never reaches the Worker. */
async function packExists(country) {
  const url = packUrl(country);
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    // Offline, or the request was blocked. Treated as absent: refusing to offer a country
    // we cannot prove we can serve is the safe direction to be wrong in.
    return false;
  }
}

/** Which file has to be present for this country, as the manifest would name it. */
function packFileName(country) {
  const v = (country.versions || [])[0];
  return v ? v.file : null;
}

/* Filled in by countriesReady(). Starts empty on purpose - anything that reads it before
   the probe has finished would otherwise be reading a guess. */
let READY_COUNTRIES = [];

let readyProbe = null;

/** Resolves once every country's pack has been looked for. Safe to await more than once;
 *  the probe runs a single time per page. */
function countriesReady() {
  if (!readyProbe) {
    readyProbe = readManifest()
      .then(async (packs) => {
        if (packs) {
          COUNTRIES.forEach((c) => {
            const file = packFileName(c);
            const listed = Array.isArray(packs[c.code]) ? packs[c.code] : [];
            c.ready = !!file && listed.includes(file);
          });
        } else {
          // No manifest. Ask for each pack instead rather than showing nobody anything.
          await Promise.all(COUNTRIES.map(async (c) => { c.ready = await packExists(c); }));
        }
        READY_COUNTRIES = COUNTRIES.filter((c) => c.ready);
        return READY_COUNTRIES;
      });
  }
  return readyProbe;
}

/** "the United States", "Germany and Spain", "the United States, Germany and Spain".
 *  Used in the sentences that name which countries are live, so those sentences are
 *  generated from what is actually there rather than typed out and left to go stale. */
function countryList(names, and = 'and') {
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}
