/* Prepare for Citizenship - web app, increment 1.
 *
 * No build step on purpose: this deploys as static assets on the same Cloudflare Worker
 * as the marketing site.
 *
 * COUNTRY PACKS. Nothing here knows anything about the United States. A country is a
 * folder under /content/<code>/ plus one entry in COUNTRIES below, so adding Canada means
 * adding a content pack and a row - not editing screens. Everything a country can differ
 * on (question pool, how many are asked, the pass mark, the local-answer questions) comes
 * from the pack's own metadata.
 *
 * FREE vs PAID mirrors the iPhone app exactly, at Sandeep's instruction:
 *   free forever - every flashcard, study by topic, local answers
 *   free once    - one complete practice test
 *   paid         - unlimited practice tests, and the interview
 *
 * THE SERVER DECIDES. Everyone has an account, so this file asks /api/me who is signed in
 * and what they have paid for, and it takes that answer as final. `pro` is never written
 * here and never read from localStorage: the iPhone app shipped a build where a client-side
 * flag could unlock paid screens (BUILD_PLAN v12), and that is the mistake this avoids.
 * Progress is server-held too, which is what makes "one free practice test" mean one
 * instead of one per browser.
 */

/* COUNTRIES and countriesReady() come from /countries.js; t(), tn() and setLanguage()
 * from /strings.js. Both are loaded before this file.
 *
 * TWO QUESTION SHAPES, DETECTED NOT ASSUMED. The United States pool is free text: a
 * question has several answers, any of which an officer accepts, and the practice test
 * has to invent plausible wrong options. The German and Spanish pools are printed as
 * multiple choice: the official material carries the wrong options too, in a fixed order.
 * Which one a question is comes from what the question actually contains - see
 * hasFixedOptions() - and never from the country code, because a pack is free to mix them
 * and a country code tells you nothing about a question.
 *
 * NUMBERS COME FROM THE PACK. How many questions a test asks, how many are needed to
 * pass, how many sections there are: all of it is read from the loaded pack. Nothing here
 * knows that the US test asks 20, that Germany asks 33, or that a pass mark is 60%. A pack
 * that does not say gets an honest "we do not know" rather than a borrowed number.
 */

const KEY = 'pfc.v1';
const PRICE = '$9.99';

/** Every API call. Credentials go with it so the session cookie is sent, and a 401 means
 *  the session expired while the tab was open - which is a trip back to sign-in, not an
 *  error message. */
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    throw new Error('signed out');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

/* Progress: the server holds it, this holds a copy.
 *
 * Reads are synchronous against the copy, because the render functions are synchronous and
 * rewriting them around promises would buy nothing. Writes update the copy and schedule a
 * PUT. localStorage is a cache for the first paint only - if it disagrees with the server,
 * the server wins, which is the point of keeping it up there. */
const store = {
  data: { answers: [], history: [], mode: 'study', versionId: null },

  hydrate(server) {
    this.data = { answers: [], history: [], mode: 'study', versionId: null, ...server };
    this.cache();
  },
  cached() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  },
  cache() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {}
  },
  read() { return this.data; },
  write(patch) {
    this.data = { ...this.data, ...patch };
    this.cache();
    scheduleSync();
    return this.data;
  },
};

/* One PUT per burst rather than one per answer: a 20-question test would otherwise be 20
   round trips. The unload flush is what stops the last answer of a test being lost when
   the tab closes on the results screen. */
let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSync, 1200);
}
function flushSync() {
  clearTimeout(syncTimer);
  syncTimer = null;
  api('/api/progress', { method: 'PUT', body: store.read() }).catch(() => {});
}
addEventListener('pagehide', () => {
  if (!syncTimer) return;
  // fetch() is not guaranteed to survive the page going away; sendBeacon is.
  try {
    navigator.sendBeacon('/api/progress', new Blob([JSON.stringify(store.read())], { type: 'application/json' }));
  } catch {}
});

let state = {
  me: null,           // { email, name, country, pro } straight from /api/me
  config: null,       // { google, paddle:{...} } from /api/config
  country: null,      // country definition
  versionId: null,
  pack: null,         // loaded question set
  mode: 'study',
  topicId: null,
  cardIndex: 0,
  revealed: false,
  test: null,         // active practice test
};

/* ------------------------------------------------------------------ helpers */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Says something once, out loud, to whoever is listening with a screen reader.
 *
 *  The region itself lives in app.html and is never replaced - see the note there. Writing
 *  the same string twice in a row is not announced a second time, so it is cleared first,
 *  which is also what makes "Correct." on two questions running read as two answers. */
/** render() replaces the pane wholesale, so anything that re-renders in response to a
 *  click has to put focus back deliberately - otherwise focus falls to the body and the
 *  next Tab starts again from the top of the page. */
function refocus(sel) {
  const n = document.querySelector(sel);
  if (n) n.focus();
}

function announce(message) {
  const region = $('#live');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => { region.textContent = message; }, 50);
}

const subsection = (s) => String(s).replace(/^[A-Z]:\s*/, '');
const titleCase = (s) => s.toLowerCase().replace(/(^|\s|\/)([a-z])/g, (m, a, b) => a + b.toUpperCase());

/** Section headings, as the pack wrote them.
 *
 *  The United States pack SHOUTS its top-level sections ("AMERICAN GOVERNMENT") and needs
 *  title-casing to be readable. No other pack does, and title-casing a Spanish heading
 *  turns "Gobierno, legislacion y participacion ciudadana" into
 *  "Gobierno, Legislacion Y Participacion Ciudadana", which is wrong in Spanish. So the
 *  transformation is applied only to text that is actually in capitals. */
const looksShouty = (s) => s === s.toUpperCase() && /[A-Z]/.test(s);
/* Title casing is an English typographic convention, so it is applied only to an English
   pack. It is also why the language test is not optional here: the German pack names its
   sections "TEIL I" and "TEIL II", and title-casing those gives "Teil Ii". */
const sectionTitle = (s) => (packLanguage() === 'en' && looksShouty(String(s || ''))
  ? titleCase(String(s))
  : String(s || ''));

/** What a section is called in the rail, on the map and in the section list.
 *
 *  The US pack splits a section from a subsection ("AMERICAN GOVERNMENT" plus
 *  "B: System of Government"); the German, Spanish and Australian packs carry only
 *  `section`. Reading `cat.subsection` unguarded printed the word "undefined" as a section
 *  name for any pack without one. */
const sectionLabel = (cat) => subsection(cat.state || cat.subsection || cat.section || '');
/** The breadcrumb above a section: the parent, then the section, when there are two
 *  levels; just the section when there is one. */
const sectionCrumb = (cat) => (cat.subsection
  ? `${sectionTitle(cat.section)} \u203a ${sectionLabel(cat)}`
  : sectionTitle(cat.section));

/** True when the pack itself says the official pool is not published, so nothing on screen
 *  may claim to be "every official question". */
const isSubsetPack = () => !!state.pack && state.pack.officialPoolPublished === false;

/* Questions whose answer depends on where you live.
 *
 * The United States pool marks them `stateSpecific` and answers them "Answers will vary."
 * Germany's Einbürgerungstest is the same idea at a larger scale: ten extra questions per
 * Bundesland, so 300 questions everybody gets and 160 that belong to one Land.
 *
 * Either way they cannot be graded without knowing where the person lives, so they are
 * kept out of practice tests - exactly as they were for the United States before any of
 * this. Every signal a pack might use is accepted, because a pack that says so any of
 * these ways is saying the same thing, and guessing wrong here would silently mark
 * somebody wrong for their own address. */
const VARIES = [/^answers will vary\.?$/i, /^antworten variieren\.?$/i, /^(las )?respuestas var[íi]an\.?$/i];
const PLACE_KEYS = ['state', 'bundesland', 'land', 'region', 'province', 'comunidad'];
function isLocal(q) {
  if (q.stateSpecific === true || q.local === true) return true;
  for (const key of PLACE_KEYS) {
    const v = q[key];
    if (typeof v === 'string' && v.trim()) return true;
  }
  return (q.answers || []).some((a) => VARIES.some((re) => re.test(String(a).trim())));
}

/* PICTURES.
 *
 * Thirty-eight German questions cannot be answered from words alone. They come in two
 * shapes, and the pack says which:
 *
 *   `optionImages` - four pictures, index-aligned with `options`, for the questions whose
 *      options literally read "Bild 1" to "Bild 4": coats of arms, the EU flag. The order
 *      is the order they are printed in and is never changed.
 *   `image` - one figure above ordinary text or numbered options: the Bundesland locator
 *      maps, the specimen ballot papers, the 1945 occupation-zones map. The numbers are
 *      printed inside the picture, so the figure goes above the options.
 *
 * A path is relative to the country's content folder. */
const optionImagesOf = (q) => (Array.isArray(q.optionImages) && q.optionImages.length ? q.optionImages : null);
const figureOf = (q) => (typeof q.image === 'string' && q.image.trim() ? q.image.trim() : null);
const imgUrl = (path) => `/content/${state.country.code}/${String(path).replace(/^\/+/, '')}`;

/** A question that needs pictures we do not have.
 *
 *  Not "a question with pictures" - those are fine now that the pictures ship. This is the
 *  narrower case: the options are picture references and no pictures came with them, which
 *  is four options reading "Bild 1" to "Bild 4" and no way to tell them apart. Asking one
 *  in a graded test would mark somebody wrong for a guess between four identical labels.
 *
 *  The German pack no longer has any (its one unanswerable question is withheld by the
 *  pack itself - see pruneUnservable). The guard stays because the next pack might. */
function needsPicture(q) {
  if (optionImagesOf(q) || figureOf(q)) return false;
  if (q.requiresImage === true) return true;
  const labels = q.imageLabels;
  const options = q.options;
  return Array.isArray(labels) && Array.isArray(options)
    && labels.length === options.length
    && options.every((o, i) => o === labels[i]);
}

/** Does this question come with its own answer options, printed in the official material?
 *
 *  Read off the question, not the country. `options` is the field the German and Spanish
 *  packs carry; `choices` is accepted as well so a pack that names it differently still
 *  works rather than silently degrading to free text. Two or more options is the test - a
 *  single "option" is not a choice, and treating it as one would show somebody a
 *  multiple-choice question with one answer in it.
 *
 *  Note what is deliberately NOT assumed: how many options there are. The
 *  Einbürgerungstest prints four; the Instituto Cervantes prints three (a, b, c). Both are
 *  drawn as they come. */
function fixedOptions(q) {
  const list = Array.isArray(q.options) ? q.options : Array.isArray(q.choices) ? q.choices : null;
  if (!list) return null;
  const clean = list.map((o) => String(o)).filter((o) => o.trim());
  return clean.length > 1 ? clean : null;
}
const hasFixedOptions = (q) => fixedOptions(q) !== null;

/** The interface language, and therefore which of the wording heuristics below can be
 *  trusted at all. They read English phrasing ("name two", "one of"), so they are only
 *  ever applied to an English pool. */
const packLanguage = () => (state.pack && state.pack.language) || (state.country && state.country.language) || 'en';

/** "Name two..." style questions genuinely need more than one pick. The definite article
 *  is the deciding signal: "name THE two parts" is one composite answer.
 *
 *  A question with official options has exactly one right answer, so it never comes here. */
function expectedCount(question, acceptableLen) {
  if (packLanguage() !== 'en') return 1;
  if (/\bone of\b/i.test(question)) return 1;
  if (/\b(?:the|its|their)\s+(?:two|three)\b/i.test(question)) return 1;
  const m = question.match(/(?:^|[.!?]\s+)(?:name|list|give|what are)\s+(two|three)\b/i);
  if (!m) return 1;
  const n = m[1].toLowerCase() === 'two' ? 2 : 3;
  return acceptableLen >= n ? n : 1;
}
function acceptsAnyOne(question, count) {
  if (packLanguage() !== 'en') return false;
  if (count <= 3) return false;
  return /\bname one\b|\bone example\b|\bone reason\b|\bone state\b|\bone power\b|\bone thing\b|\bname five\b|\bname three\b/i.test(question);
}

/* The general pool: what a graded test draws from, what the map of the test shows, and
   what "% of the pool seen" is measured against. */
const allQuestions = () => (state.pack.categories || []).flatMap((c) => c.questions);

/** Sections offered for study, which is the general pool plus the state-specific ones.
 *
 *  The German pack keeps its Bundesland questions in `stateCategories` - 16 sets of ten,
 *  and a candidate gets only the ten for the Land they live in. There is nowhere yet to ask
 *  which Land that is, so they are offered to read and study, one section per Bundesland,
 *  and kept out of everything that is graded or counted. That is the same treatment the
 *  United States' "answers will vary" questions have always had: studyable, never marked.
 *
 *  A pack with no `stateCategories` is unaffected. */
const studyCategories = () => [
  ...(state.pack.categories || []),
  ...(Array.isArray(state.pack.stateCategories) ? state.pack.stateCategories : []),
];
const categoryOf = (id) => (state.pack.categories || []).find((c) => c.questions.some((q) => q.id === id));

/** How the real test is shaped, straight from the pack: how many questions it asks and how
 *  many of them have to be right.
 *
 *  There is no default. The United States asks 20 of 128 and needs 12; Germany asks 33 of
 *  310 and needs 17; Spain asks 25 of 300 and needs 15. Every one of those was, at some
 *  point, a number written into a screen - and a screen with a number in it quietly tells a
 *  German that they need 12 correct. `null` means the pack did not say, and every caller
 *  says so rather than borrowing somebody else's arithmetic. */
function packFormat() {
  const p = state.pack || {};
  // Two names for the same number, because "interview" is only the right word where an
  // officer asks the questions out loud. `askedPerTest` is what a written paper is called
  // in the pack schema; both are read so neither pack shape has to be edited to fit.
  const askedRaw = p.askedPerTest != null ? p.askedPerTest : p.askedPerInterview;
  const asked = Number.isFinite(Number(askedRaw)) && Number(askedRaw) > 0
    ? Number(askedRaw) : null;
  const pass = Number.isFinite(Number(p.passRequirement)) && Number(p.passRequirement) > 0
    ? Number(p.passRequirement) : null;
  return { asked, pass, passPct: asked && pass ? Math.round((pass / asked) * 100) : null };
}
/** Paid access, as the server reported it. There is deliberately no way to set this from
 *  the browser - see the header note. */
const isPro = () => !!(state.me && state.me.pro);

/** One row per graded answer: which section it came from and whether it was right.
 *  Capped so localStorage can't grow without bound. */
function recordAnswer(q, correct) {
  const cat = categoryOf(q.id);
  const log = store.read().answers || [];
  log.push({ q: q.id, c: cat ? cat.id : null, ok: !!correct, at: Date.now() });
  store.write({ answers: log.slice(-4000) });
}

/** Accuracy per official section, weakest first. Sections never attempted are
 *  reported separately rather than shown as 0% - untested is not the same as wrong. */
function sectionAccuracy() {
  const log = store.read().answers || [];
  const byCat = new Map();
  log.forEach((r) => {
    if (!r.c) return;
    const key = String(r.c);
    const cur = byCat.get(key) || { seen: 0, ok: 0 };
    cur.seen += 1;
    if (r.ok) cur.ok += 1;
    byCat.set(key, cur);
  });
  return (state.pack.categories || []).map((cat) => {
    const d = byCat.get(String(cat.id));
    return {
      id: cat.id,
      label: sectionLabel(cat),
      section: sectionTitle(cat.section),
      total: cat.questions.length,
      seen: d ? d.seen : 0,
      ok: d ? d.ok : 0,
      pct: d && d.seen ? Math.round((d.ok / d.seen) * 100) : null,
    };
  });
}
const usedFreeTest = () => (store.read().history || []).length >= 1;

/* ------------------------------------------------------------------ country gate */

/** A country's name in the language on screen, with the English name from the country row
 *  as the fallback. `prose` is the form that goes inside a sentence - "the United States"
 *  rather than "United States". */
function countryLabel(c, prose = false) {
  const key = `country.${c.code}`;
  const named = t(key);
  const label = named === key ? c.name : named;
  if (!prose) return label;
  // tOwn, not t: an English fallback here would put "the United States" in the middle of
  // a Spanish sentence. The country row's own `prose` is the last resort.
  return tOwn(`${key}.prose`) || (named === key ? (c.prose || c.name) : label);
}

function renderGate() {
  const box = $('#countries');
  box.innerHTML = '';
  COUNTRIES.forEach((c) => {
    const b = el('button', 'country');
    // `ready` was decided by looking for the content pack, not by a flag in a list - see
    // countries.js. A country nobody has written questions for cannot be clicked.
    b.disabled = !c.ready;
    b.innerHTML = `<span class="flag">${c.flag}</span>
      <span><b>${esc(countryLabel(c))}</b><small>${esc(c.test)}</small></span>
      ${c.ready ? '' : `<span class="label soon">${esc(t('gate.coming'))}</span>`}`;
    b.addEventListener('click', () => pickCountry(c.code));
    box.appendChild(b);
  });
  // Generated from what is actually there. The sentence used to name the United States in
  // so many words, which would have gone stale the day a second pack landed.
  const live = COUNTRIES.filter((c) => c.ready).map((c) => countryLabel(c, true));
  $('#gateNote').textContent = live.length
    ? t('gate.note', { countries: countryList(live, t('list.and')) })
    : t('gate.note.none');
}

/** Locks the country to the account, server-side. The gate is only ever shown to an
 *  account that has none, so this is a first-time write - the server refuses a change. */
async function pickCountry(code) {
  const note = $('#gateNote');
  document.querySelectorAll('.country').forEach((b) => { b.disabled = true; });
  note.textContent = t('gate.setting');
  try {
    const { user } = await api('/api/me/country', { method: 'POST', body: { country: code } });
    state.me = user;
    await boot();
  } catch (err) {
    note.textContent = err.message;
    renderGate();
  }
}

/* ---------- theme ----------
 *
 * Three states, not two: the default is to follow the operating system, and a choice
 * overrides it. Stamping data-theme on <html> is what the CSS already keys off - see the
 * three-block pattern at the top of app.css - so nothing else has to know about this.
 *
 * Applied before the shell is revealed, so a dark-mode visitor never sees a white flash.
 */
const THEME_KEY = 'pfc.theme';

function readTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}
function systemPrefersDark() {
  return matchMedia('(prefers-color-scheme: dark)').matches;
}
/** What is actually on screen right now, whether chosen or inherited. */
function effectiveTheme() {
  return readTheme() || (systemPrefersDark() ? 'dark' : 'light');
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = $('#themeToggle');
  if (!btn) return;
  const dark = theme === 'dark';
  // The button offers the other one, so it is labelled with what it will do.
  btn.setAttribute('aria-pressed', String(dark));
  btn.setAttribute('aria-label', dark ? t('theme.toLight') : t('theme.toDark'));
  btn.title = dark ? t('theme.toLight') : t('theme.toDark');
  const label = btn.querySelector('.theme-label');
  if (label) label.textContent = dark ? t('theme.light') : t('theme.dark');
}
function initTheme() {
  applyTheme(effectiveTheme());
  const btn = $('#themeToggle');
  if (btn) {
    btn.onclick = () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      applyTheme(next);
      // Redraw: the charts are SVG built with the token values resolved at render time.
      if (state.pack) render();
    };
  }
  // Follow the system until somebody chooses otherwise.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!readTheme()) { applyTheme(effectiveTheme()); if (state.pack) render(); }
  });
}

/* ------------------------------------------------------------------ language */

/** Writes the current language over the markup in app.html.
 *
 *  The page ships with English in it, because HTML that arrives empty flashes blank and
 *  because a reader with no JavaScript should still see words. Every element that holds a
 *  word the app chose - as opposed to a word from the question pool - carries data-i18n,
 *  and this replaces it once the language is known. */
function localizeDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => {
    n.textContent = t(n.dataset.i18n);
  });
}

/* ------------------------------------------------------------------ boot */

/* Answers that change with an election or an appointment are stored as `DYNAMIC:field`
 * tokens rather than as names, and resolved against the country's officials file at load.
 *
 * They are resolved once, in place, the moment the pack is loaded - not at each render.
 * Every screen reads `q.answers`, and the practice test even draws its wrong options from
 * other questions' answers, so resolving in one place is the only way to be sure a token
 * cannot reach a screen. Before this, the website showed the literal string
 * "DYNAMIC:president" to people as the correct answer.
 *
 * A token with no matching value is dropped rather than shown. An answer we cannot source
 * is worse than a question with one fewer accepted answer, and the officials file records
 * what it was verified against and when.
 */
async function resolveDynamicAnswers(pack, countryCode) {
  const tokens = new Set();
  const questions = (pack.categories || []).flatMap((c) => c.questions || []);
  questions.forEach((q) => (q.answers || []).forEach((a) => {
    if (typeof a === 'string' && a.startsWith('DYNAMIC:')) tokens.add(a);
  }));
  if (!tokens.size) return pack;

  const res = await fetch(`/content/${countryCode}/officials/national-dynamic.json`).catch(() => null);
  const officials = res && res.ok ? await res.json().catch(() => null) : null;

  questions.forEach((q) => {
    if (!q.answers) return;
    q.answers = q.answers
      .map((a) => {
        if (typeof a !== 'string' || !a.startsWith('DYNAMIC:')) return a;
        const value = officials ? officials[a.slice('DYNAMIC:'.length)] : undefined;
        return value === undefined || value === null || value === '' ? null : String(value);
      })
      .filter((a) => a !== null);
  });

  if (!officials) {
    // Left for the console rather than the screen: the questions have simply lost an
    // answer, which the UI handles, and there is nothing a visitor could do about it.
    console.error(`officials data unavailable for ${countryCode}; ${tokens.size} answer(s) dropped`);
  }
  return pack;
}

/** Drops every question the pack marks `servable: false`, before anything else sees it.
 *
 *  One German question asks "was zeigt dieses Bild?" about a photograph we have no licence
 *  to redistribute. Without the photograph there is no question - just four building names
 *  and no way to choose - so the pack refuses to serve it and this is what enforces that.
 *
 *  Done here, at load, rather than filtered at each screen: every screen reads the pack,
 *  and one that forgot to filter would put an unanswerable question in front of somebody.
 *  Removing it once means the flashcards, the test, the interview, the map of the test and
 *  every count are all consistent, because none of them ever knew it existed. */
function pruneUnservable(pack) {
  let dropped = 0;
  ['categories', 'stateCategories'].forEach((key) => {
    if (!Array.isArray(pack[key])) return;
    pack[key].forEach((cat) => {
      const before = (cat.questions || []).length;
      cat.questions = (cat.questions || []).filter((q) => q.servable !== false);
      dropped += before - cat.questions.length;
    });
  });
  if (dropped) {
    console.info(`${dropped} question(s) withheld by the content pack (servable: false)`);
  }
  return pack;
}

async function loadPack(country, versionId) {
  const version = (country.versions || []).find((v) => v.id === versionId) || country.versions[0];
  const res = await fetch(`/content/${country.code}/${version.file}`);
  if (!res.ok) throw new Error(`content pack missing for ${country.code}`);
  const pack = pruneUnservable(await resolveDynamicAnswers(await res.json(), country.code));
  return { pack, versionId: version.id };
}

/** Runs once. The page itself is already behind the sign-in wall - the Worker will not
 *  serve /app without a session - so this is not the gate, it is where we find out *which*
 *  account we are and what it is allowed to see. */
async function boot() {
  // Started here rather than awaited below, so looking for the content packs runs
  // alongside the two API calls instead of after them.
  const packsFound = countriesReady();

  if (!state.me) {
    const [{ user }, config] = await Promise.all([
      api('/api/me'),
      api('/api/config').catch(() => ({ google: false, paddle: { configured: false } })),
    ]);
    state.me = user;
    state.config = config;
    // The best guess available before a pack is loaded. The country picker is the one
    // screen an account with no country ever sees, and the browser's own preference is a
    // better guess there than English for everybody. A loaded pack overrides it below.
    setLanguage(preferredLanguage());
    localizeDom();
    initTheme();
    // Only the owner can open /insights; everyone else gets a 404 from it.
    const insights = $('#insightsLink');
    if (insights) insights.hidden = !user.isOwner;
    if (config.paddle && config.paddle.environment === 'sandbox' && config.paddle.configured) {
      showSandboxBanner();
    }
  }

  await packsFound;
  const country = COUNTRIES.find((c) => c.code === state.me.country && c.ready);
  if (!country) {
    // No country on the account yet: a Google signup, which had nowhere to ask.
    $('#booting').hidden = true;
    $('#shell').hidden = true;
    $('#gate').hidden = false;
    renderGate();
    return;
  }

  // Paint from the cached copy, then let the server's copy replace it. Someone opening the
  // app on a second device has an empty cache and simply waits for the fetch.
  const cached = store.cached();
  if (cached) store.data = { ...store.data, ...cached };
  const progress = await api('/api/progress').catch(() => null);
  if (progress) store.hydrate(progress);

  const saved = store.read();
  const { pack, versionId } = await loadPack(country, saved.versionId);
  state.country = country;
  state.pack = pack;
  state.versionId = versionId;
  // The pack decides. A German pack means German buttons and <html lang="de">, which is
  // what tells a screen reader to read the questions with a German voice.
  setLanguage(pack.language || country.language || 'en');
  localizeDom();
  state.mode = saved.mode || 'study';
  if (state.mode === 'insights' && !state.me.isOwner) state.mode = 'study';
  state.topicId = null;

  renderRail();
  render();

  // Only now. Revealing the shell any earlier means the mode buttons are live while the
  // two fetches above are still running, and this render throws away whatever was clicked
  // in the meantime. On localhost that window is a few milliseconds; over a real
  // connection it is long enough to lose a click every time.
  $('#booting').hidden = true;
  $('#gate').hidden = true;
  $('#shell').hidden = false;
}

/** Only ever appears against Paddle's sandbox. A test card must never be mistakable for a
 *  real payment. */
function showSandboxBanner() {
  const bar = el('div', 'sandbox', esc(t('sandbox.banner')));
  document.body.prepend(bar);
}

/* ------------------------------------------------------------------ rail */
function renderRail() {
  const c = state.country;
  // Guarded: a country row with no versions would throw here, and `versions` is exactly
  // the field that is empty for a country whose pack has not been cleared to ship.
  const v = (c.versions || []).find((x) => x.id === state.versionId);
  // The country's name in the language on screen: a German account reads "Deutschland",
  // not "Germany". The test name underneath is not translated - it is the official name.
  $('#picked').innerHTML = `<span class="flag">${c.flag}</span>
    <span><b>${esc(countryLabel(c))}</b><small>${esc(v ? v.label : c.test)}</small></span>`;

  renderVersions(c);

  document.querySelectorAll('.mode[data-mode]').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.mode === state.mode));
    // The label is markup in app.html carrying data-i18n; localizeDom() has already put
    // the right language on it. Nothing here writes mode names.
    b.onclick = () => {
      // A test in progress is paused, not thrown away. Answering a question and then
      // looking at Performance used to discard the whole attempt with nothing said; the
      // practice screen now offers it back.
      if (state.test && b.dataset.mode !== 'practice') state.test.paused = true;
      state.mode = b.dataset.mode;
      store.write({ mode: state.mode });
      renderRail();
      render();
    };
  });
  const lock = document.querySelector('[data-lockicon]');
  if (lock) lock.hidden = isPro();

  const topics = $('#topics');
  topics.innerHTML = '';
  $('#topicsBlock').hidden = state.mode !== 'study';
  const all = el('button', 'topic');
  all.innerHTML = esc(t('rail.allSections'));
  all.setAttribute('aria-current', String(!state.topicId));
  all.onclick = () => { state.topicId = null; state.cardIndex = 0; state.revealed = false; renderRail(); render(); };
  topics.appendChild(all);
  studyCategories().forEach((cat) => {
    const b = el('button', 'topic');
    b.innerHTML = esc(sectionLabel(cat));
    b.setAttribute('aria-current', String(state.topicId === cat.id));
    b.onclick = () => { state.topicId = cat.id; state.cardIndex = 0; state.revealed = false; renderRail(); render(); };
    topics.appendChild(b);
  });

  // Who is signed in, and the country they are locked to. Shown rather than hidden in a
  // menu: on a shared computer it should be obvious whose progress is on screen.
  $('#who').innerHTML = `<b>${esc(state.me.name || state.me.email)}</b>
    <small>${esc(state.me.name ? state.me.email : (isPro() ? t('who.fullAccess') : t('who.freeAccount')))}</small>`;

  $('#signOut').onclick = async () => {
    flushSync();
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    // Drop the local copy too, so the next person to use this browser does not see the
    // previous person's progress flash up before the redirect.
    try { localStorage.removeItem(KEY); } catch {}
    location.replace('/login');
  };
}

/** The version picker, in the rail under the country. Country-agnostic: a country with a
 *  single version never sees it, and every word on it comes from the country's definition.
 *
 *  This is the one place a test-version year is printed in the main UI, and deliberately so:
 *  it is a control the person operates. The alternative - the app picking for them - means
 *  somebody studies the wrong question pool without ever being told there was a choice. */
function renderVersions(country) {
  const versions = country.versions || [];
  const block = $('#versionBlock');
  block.hidden = versions.length < 2;
  if (block.hidden) return;

  const box = $('#versions');
  box.setAttribute('aria-label', t('rail.versionsLabel', { test: country.test }));
  box.innerHTML = '';
  versions.forEach((v) => {
    const b = el('button', 'ver', esc(v.label));
    b.setAttribute('aria-pressed', String(v.id === state.versionId));
    b.onclick = () => switchVersion(v.id);
    box.appendChild(b);
  });
  $('#versionNote').textContent = t('rail.versionNote');
}

/** Switches question pool. Loads the other pack first, then drops what belonged to the old
 *  one: the section filter, the card position and any test in progress, whose questions came
 *  from the other pool. Answers already recorded stay - each is stamped with the section it
 *  was given in. The choice goes through store.write, so it syncs to the account and the
 *  next visit starts on the same version. */
async function switchVersion(versionId) {
  if (versionId === state.versionId) return;
  if (state.test && !testFinished(state.test)
      && !confirm(t('rail.versionSwitchConfirm'))) return;

  const buttons = [...document.querySelectorAll('.ver')];
  buttons.forEach((b) => { b.disabled = true; });
  try {
    const loaded = await loadPack(state.country, versionId);
    state.pack = loaded.pack;
    state.versionId = loaded.versionId;
    state.topicId = null;
    state.cardIndex = 0;
    state.revealed = false;
    state.test = null;
    store.write({ versionId: loaded.versionId });
    // Sent now rather than on the usual debounce. Answers can wait 1.2 seconds; a version
    // change cannot, because a reload in that window would come back on the old pool - and
    // boot() hydrates from the server, so the local copy would be overwritten, not kept.
    flushSync();
    renderRail();
    render();
    const v = (state.country.versions || []).find((x) => x.id === state.versionId);
    announce(t('rail.versionSwitched', { label: v ? v.label : versionId }));
  } catch {
    // Nothing was replaced, so say so rather than leaving a dead picker.
    buttons.forEach((b) => { b.disabled = false; });
    $('#versionNote').textContent = t('rail.versionFailed');
  }
}

/** What this question pool actually is, when the pack says something about itself.
 *
 *  Three things get shown, and only if the pack carries them:
 *
 *  - `disclosure`, whenever the pack states that the official pool is not published. The
 *    Australian practice set is twenty questions and the real test draws from a pool
 *    nobody publishes; showing those twenty under a heading reading "every official
 *    question" would be a straightforward untruth. The pack is the only thing that knows,
 *    so the pack's own words are used.
 *  - `licence.attribution`, when there is a licence. Not decoration: CC BY requires
 *    attribution, and an attribution nobody can see does not satisfy it.
 *  - `valuesRule.note`, or any pack rule stated in prose - Australia additionally requires
 *    every values question right. Stated rather than implemented, and stated in the pack's
 *    own words rather than paraphrased.
 *
 *  All of it is content, so none of it is translated. */
function packNotice(pane) {
  const p = state.pack || {};
  const box = el('div', 'pack-note');
  let any = false;

  // Shown whenever the pack carries one, not only for a practice subset. The German
  // catalogue's disclosure is the sentence that matters most on the whole screen: BAMF says
  // its own catalogue wording "can differ slightly" from the exam paper, so "the official
  // catalogue" is the strongest true claim and this is where that is said.
  if (p.disclosure) {
    box.appendChild(el('p', 'label', esc(t('pack.about'))));
    box.appendChild(el('p', null, esc(p.disclosure)));
    any = true;
  }
  const rule = p.valuesRule && p.valuesRule.note;
  if (rule) {
    box.appendChild(el('p', 'label', esc(t('pack.extraRule'))));
    box.appendChild(el('p', null, esc(rule)));
    any = true;
  }
  const lic = p.licence || p.license;
  if (lic && lic.attribution && lic.name) {
    const line = el('p', 'pack-lic', esc(t('pack.licence', { attribution: lic.attribution, licence: lic.name })));
    if (lic.url) {
      line.appendChild(document.createTextNode(' '));
      const a = el('a', null, esc(t('pack.licenceLink')));
      a.href = lic.url;
      a.rel = 'noopener';
      a.target = '_blank';
      line.appendChild(a);
    }
    box.appendChild(line);
    any = true;
  }
  if (any) pane.appendChild(box);
}

/* ------------------------------------------------------------------ render */
const WIDE_MODES = ['performance', 'insights'];

function render() {
  const pane = $('#pane');
  pane.innerHTML = '';
  // The dashboards use the whole width; reading modes keep a comfortable measure.
  pane.classList.toggle('is-wide', WIDE_MODES.includes(state.mode));
  ({
    study: renderStudy,
    practice: renderPractice,
    interview: renderInterview,
    performance: renderPerformance,
    insights: renderInsights,
  }[state.mode] || renderStudy)(pane);
}

function crumb(pane, text) {
  pane.appendChild(el('div', 'crumb', `<span class="label">${esc(text)}</span>`));
}

/* ---------- study: free forever ---------- */
/** One picture from the pack.
 *
 *  `object-fit: contain` inside a fixed box, and no filter of any kind. The images arrive
 *  already composited onto white, which is why they sit on a white tile in dark mode too:
 *  several are black line art and one option is a black Chi-Rho that vanishes completely on
 *  a dark ground. A white tile in the dark theme is not an oversight - it is what the
 *  official document looks like, and it is the only version of these that is legible. */
function packImage(path, alt, cls) {
  return `<img class="${cls}" src="${esc(imgUrl(path))}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}

/** The single figure some questions are answered from, with its own credit when the pack
 *  gives one. Rendered above the options, because the option numbers are printed inside
 *  the picture. */
function questionFigure(q) {
  const path = figureOf(q);
  if (!path) return '';
  const credit = q.imageCredit ? `<figcaption class="credit">${esc(q.imageCredit)}</figcaption>` : '';
  return `<figure class="qfig">${packImage(path, t('study.figureAlt'), 'qfig-img')}${credit}</figure>`;
}

/** Says where the questions came from, which for the German catalogue is a legal duty and
 *  not a courtesy: section 63 UrhG requires the source to be stated, and the pack says so
 *  itself in `licence.attributionMustBeOnScreen`.
 *
 *  Appended to every screen that shows a question - study, the practice intro, a practice
 *  question, the results, the read-aloud mode - rather than only to the one screen where it
 *  looked tidiest. A pack with no licence block (the United States' federal work needs
 *  none) renders nothing, so nothing about the US changes. */
function packAttribution(pane) {
  const lic = (state.pack && (state.pack.licence || state.pack.license)) || null;
  if (!lic || !lic.attribution) return;
  pane.appendChild(el('p', 'pack-credit', esc(t('pack.source', { attribution: lic.attribution }))));
}

/** The official options, drawn in the order the official material prints them.
 *
 *  Never shuffled. On a multiple-choice paper the order is part of the question - somebody
 *  who has learned the printed catalogue should recognise the same card here, and for the
 *  picture questions the order is the order the pictures are printed left to right.
 *
 *  Marks the right answer only when it has been asked for. */
function optionList(options, correct, q) {
  const right = new Set(correct || []);
  const pics = q ? optionImagesOf(q) : null;
  return `<ul class="olist${pics ? ' has-pics' : ''}">${options.map((o, idx) => {
    const ok = right.has(o);
    // The option's own label is the alt text. It is not a description of the picture -
    // nothing here could honestly describe a coat of arms - but it is what tells somebody
    // which numbered option they are looking at.
    const pic = pics && pics[idx] ? packImage(pics[idx], o, 'oimg') : '';
    return `<li class="${ok ? 'is-right' : ''}"><span class="k" aria-hidden="true">${idx + 1}</span>`
      + `<span class="otext">${pic}<span>${esc(o)}</span></span>`
      + `${ok ? `<span class="mark">${esc(t('study.correctAnswer'))}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

function renderStudy(pane) {
  const cat = studyCategories().find((c) => c.id === state.topicId);
  const pool = cat ? cat.questions : allQuestions();
  crumb(pane, cat ? sectionCrumb(cat) : t('study.crumbAll'));
  pane.appendChild(el('h2', null, cat ? esc(sectionLabel(cat)) : esc(t('study.title'))));
  pane.appendChild(el('p', 'sub', esc(isSubsetPack() ? t('study.subSubset') : t('study.sub'))));
  packNotice(pane);

  if (!pool.length) { pane.appendChild(el('div', 'card', `<p>${esc(t('study.empty'))}</p>`)); return; }
  const i = state.cardIndex % pool.length;
  const q = pool[i];
  const answers = q.answers || [];
  // What shape is this question? Asked of the question, not of the country.
  const options = fixedOptions(q);

  const prog = el('div', 'progress', `<i style="width:${Math.max(2, ((i + 1) / pool.length) * 100)}%"></i>`);
  pane.appendChild(prog);

  const wrap = el('button', 'flip');
  // A toggle, and it has to say so: without aria-expanded the card is a button whose label
  // silently changes from a question to a list of answers.
  wrap.setAttribute('aria-expanded', String(state.revealed));
  const card = el('div', 'card');
  // Said on both sides of the card, because "Bild 1" is not an answer and the reason has
  // to be on screen wherever the option list is.
  const pictureNote = needsPicture(q)
    ? `<p class="note">${esc(Array.isArray(q.sourcePages) && q.sourcePages.length
        ? t('study.needsPicturePage', { page: q.sourcePages.join(', ') })
        : t('study.needsPicture'))}</p>`
    : '';

  if (!state.revealed) {
    // A multiple-choice question shows its options on the front. Without them the card is
    // not the question the person will actually be asked.
    card.innerHTML = `<span class="label">${esc(t('study.questionLabel', { id: q.id }))}</span>
      <p class="q">${esc(q.question)}</p>
      ${questionFigure(q)}
      ${options ? optionList(options, null, q) : ''}
      ${pictureNote}
      <p class="label" style="margin-top:18px">${esc(t('study.clickReveal'))}</p>`;
  } else if (options) {
    // The question stays on screen: options with no question above them are unreadable.
    card.innerHTML = `<span class="label">${esc(answers.length > 1 ? t('study.acceptedAnswers', { n: answers.length }) : t('study.correctAnswer'))}</span>
      <p class="q">${esc(q.question)}</p>
      ${questionFigure(q)}
      ${optionList(options, answers, q)}
      ${pictureNote}
      ${q.note ? `<p class="note">${esc(q.note)}</p>` : ''}
      <p class="label" style="margin-top:16px">${esc(t('study.clickBack'))}</p>`;
  } else {
    const many = answers.length > 1;
    card.innerHTML = `<span class="label">${esc(many ? t('study.acceptedAnswers', { n: answers.length }) : t('study.answer'))}</span>
      ${acceptsAnyOne(q.question, answers.length) ? `<p style="color:var(--accent-ink);font-size:13.5px;margin:6px 0 0">${esc(t('study.anyOne'))}</p>` : ''}
      <ul class="answers">${answers.map((a) => `<li><span class="tick" aria-hidden="true">\u2713</span><span>${esc(a)}</span></li>`).join('')}</ul>
      ${q.note ? `<p class="note">${esc(q.note)}</p>` : ''}
      <p class="label" style="margin-top:16px">${esc(t('study.clickBack'))}</p>`;
  }
  wrap.appendChild(card);
  wrap.onclick = () => {
    state.revealed = !state.revealed;
    render();
    // render() replaced the card, so focus would otherwise fall to the body and the next
    // Tab would start again from the top of the page. Focus goes back on the card, which
    // is also what makes a screen reader read the side that has just been turned up - so
    // there is deliberately no live-region copy here, which would only double-speak.
    refocus('.flip');
  };
  pane.appendChild(wrap);

  const row = el('div', 'row');
  const prev = el('button', 'btn ghost', esc(t('btn.previous')));
  prev.onclick = () => { state.cardIndex = (i - 1 + pool.length) % pool.length; state.revealed = false; render(); refocus('.btn.ghost'); };
  const next = el('button', 'btn', esc(t('btn.nextQuestion')));
  next.onclick = () => { state.cardIndex = (i + 1) % pool.length; state.revealed = false; render(); refocus('.row .btn:not(.ghost)'); };
  row.append(prev, next);
  // Position without a total: enough to know where you are, without publishing how
  // many questions the pool holds.
  row.appendChild(el('span', 'label', esc(t('study.card', { n: i + 1 }))));
  pane.appendChild(row);
  packAttribution(pane);
}

/* ---------- practice: first test free, then paid ---------- */

/** Can this question be marked at all?
 *
 *  Free text needs at least one accepted answer. A multiple-choice question needs at least
 *  one of its accepted answers to actually appear among its options - otherwise there is
 *  no button that counts as right, and the person would be marked wrong whatever they
 *  pressed. The pack validator refuses that shape, and this refuses to ask it. */
function isGradeable(q) {
  const answers = q.answers || [];
  const options = fixedOptions(q);
  if (!options) return answers.length > 0;
  return answers.some((a) => options.includes(a));
}

function buildTest(count) {
  const pool = allQuestions().filter((q) => !isLocal(q) && !needsPicture(q) && isGradeable(q));
  return shuffle(pool).slice(0, Math.min(count, pool.length)).map((q) => {
    const acceptable = q.answers || [];
    const official = fixedOptions(q);

    if (official) {
      /* The official material already prints the options, and prints them in an order.
       * Both are part of the question: somebody who has learned the printed catalogue is
       * looking for the answer in the place it was printed. So neither the options nor
       * their order is regenerated here - which also means we never invent a wrong answer
       * for a test whose wrong answers are themselves official. */
      const correct = acceptable.filter((a) => official.includes(a));
      return { q, acceptable: correct, expected: 1, correct: new Set(correct), options: official, picked: [], graded: null };
    }

    /* Free text - the United States shape. There are no official wrong options, so
     * plausible ones are borrowed from other questions' answers. */
    const expected = expectedCount(q.question, acceptable.length);
    const correct = shuffle(acceptable).slice(0, expected);
    const others = shuffle(
      allQuestions().filter((o) => o.id !== q.id && !isLocal(o)).flatMap((o) => o.answers || [])
    );
    const distractors = [];
    const taken = new Set(acceptable);
    for (const d of others) {
      if (distractors.length >= 3) break;
      if (taken.has(d) || distractors.includes(d)) continue;
      distractors.push(d);
    }
    return { q, acceptable, expected, correct: new Set(correct), options: shuffle([...correct, ...distractors]), picked: [], graded: null };
  });
}

/** A test is finished once every question has been walked past. That is also the moment it
 *  counts against the free allowance, because the history row is written on the results
 *  screen - see the note on renderPausedTest. */
const testFinished = (test) => test.at >= test.items.length;

/** The outcome of a graded question, in words. Built in one place so the sentence drawn on
 *  the card and the sentence announced to a screen reader cannot drift apart. */
function verdictFor(item) {
  const answers = [...item.correct];
  const lead = item.graded ? t('verdict.correct') : t('verdict.incorrect');
  // A right answer to a one-answer question needs no restatement; anything else does.
  const rest = item.graded && answers.length === 1
    ? ''
    : t(answers.length > 1 ? 'verdict.answersAre' : 'verdict.answerIs', { answers: answers.join('; ') });
  return { cls: item.graded ? 'right' : 'wrong', glyph: item.graded ? '\u2713' : '\u2715', lead, rest, text: `${lead} ${rest}`.trim() };
}

/** The resume screen.
 *
 *  state.test used to be dropped the instant the mode changed, so answering one question
 *  and glancing at Performance threw the attempt away with nothing said. It is offered back
 *  rather than resumed on sight: landing straight in the middle of a half-finished test is
 *  its own kind of surprise.
 *
 *  Note what this does not change: the free allowance is still spent by *finishing* a test,
 *  because that is when the history row is written. Resuming is therefore always free, and
 *  somebody who abandons a test can still start another - the same as before this screen
 *  existed. Closing that would mean holding the attempt on the server. */
function renderPausedTest(pane, test) {
  const where = { n: test.at + 1, total: test.items.length };
  crumb(pane, t('practice.crumb'));
  pane.appendChild(el('h2', null, esc(t('paused.title'))));
  pane.appendChild(el('p', 'sub', esc(t('paused.sub', where))));
  pane.appendChild(el('div', 'progress', `<i style="width:${(test.at / test.items.length) * 100}%"></i>`));

  const card = el('div', 'card');
  card.innerHTML = `<span class="label">${esc(t('paused.label'))}</span>
    <p class="q">${esc(t('practice.questionOf', where))}</p>
    <p style="color:var(--ink-2);margin:10px 0 0">${esc(test.pass
      ? t('paused.correctSoFar', { n: test.correct, pass: test.pass })
      : t('paused.correctSoFarNoMark', { n: test.correct }))}</p>`;
  pane.appendChild(card);

  const row = el('div', 'row');
  const go = el('button', 'btn', esc(t('btn.resumeTest')));
  go.onclick = () => {
    test.paused = false;
    render();
    refocus('.opt');
  };
  const drop = el('button', 'btn ghost', esc(t('btn.discardTest')));
  drop.onclick = () => { state.test = null; render(); };
  row.append(go, drop);
  pane.appendChild(row);
  if (!isPro() && !usedFreeTest()) {
    pane.appendChild(el('p', 'pay-note', esc(t('paused.freeNote'))));
  }
}

function renderPractice(pane) {
  /* Read from the pack, with no fallback. This used to read
   *   askedPerInterview || 10   and   passRequirement || Math.ceil(asked * 0.6)
   * which is a 60% pass mark invented out of nothing and a ten-question test belonging to
   * no country at all. Germany asks 33 and needs 17 (51%); Spain asks 25 and needs 15
   * (60%); the United States asks 20 and needs 12. A default here would quietly tell one
   * of them somebody else's rules. */
  const { asked, pass } = packFormat();
  const version = (state.country.versions || []).find((v) => v.id === state.versionId);

  if (state.test && state.test.paused && !testFinished(state.test)) return renderPausedTest(pane, state.test);

  if (!state.test) {
    crumb(pane, t('practice.crumb'));
    pane.appendChild(el('h2', null, esc(t('practice.title'))));
    pane.appendChild(el('p', 'sub',
      esc(asked && pass ? t('practice.sub', { asked, pass }) : t('practice.subUnknown'))));
    packNotice(pane);

    // Nothing to build a test out of, so say that rather than making the numbers up.
    if (!asked || !pass) {
      pane.appendChild(el('div', 'card', `<p>${esc(t('practice.unavailable'))}</p>`));
      return;
    }

    if (usedFreeTest() && !isPro()) { paywall(pane, t('paywall.unlimitedTests')); return; }

    const card = el('div', 'card');
    card.innerHTML = `<span class="label">${esc(countryLabel(state.country))}${version ? ` \u00b7 ${esc(version.label)}` : ''}</span>
      <p class="q">${esc(t('practice.card', { asked, pass }))}</p>
      <p style="color:var(--ink-2);margin:10px 0 0">${esc(usedFreeTest() ? t('practice.unlimited') : t('practice.firstFree'))}</p>`;
    pane.appendChild(card);
    const row = el('div', 'row');
    const go = el('button', 'btn', esc(t('btn.startTest')));
    go.onclick = () => { state.test = { items: buildTest(asked), at: 0, correct: 0, pass }; render(); };
    row.appendChild(go);
    pane.appendChild(row);
    packAttribution(pane);
    return;
  }

  /* Named `test`, not `t`. `t` is the translation function, and a local called `t` here
     shadowed it - so every string in this function would have tried to call the test
     object. Caught before it ran, but it is exactly the kind of collision a one-letter
     name invites. */
  const test = state.test;
  if (testFinished(test)) return renderResults(pane, test);

  const item = test.items[test.at];
  crumb(pane, t('practice.questionOf', { n: test.at + 1, total: test.items.length }));
  pane.appendChild(el('div', 'progress', `<i style="width:${((test.at) / test.items.length) * 100}%"></i>`));

  const instruction = item.expected > 1
    ? t('practice.selectN', { n: item.expected })
    : t('practice.selectOne');
  const card = el('div', 'card');
  // The figure goes above the options because the option numbers are printed inside it.
  card.innerHTML = `<span class="label">${esc(instruction)}</span>
    <p class="q">${esc(item.q.question)}</p>
    ${questionFigure(item.q)}`;
  const opts = el('div', 'opts');
  // Named as a group, so the options are announced as the answers to this question rather
  // than as loose buttons somewhere on a page. How many there are is the pack's business:
  // the Einbuergerungstest prints four, the CCSE three.
  opts.setAttribute('role', 'group');
  opts.setAttribute('aria-label', t('practice.optsLabel', { instruction, question: item.q.question }));
  const optionPics = optionImagesOf(item.q);
  item.options.forEach((o, idx) => {
    // The number is a visual anchor, not a shortcut: read out before every option it is
    // just noise. Where the option IS a picture, the picture sits with the label rather
    // than replacing it, so the numbered option and the image stay tied together.
    const pic = optionPics && optionPics[idx] ? packImage(optionPics[idx], o, 'oimg') : '';
    const b = el('button', `opt${pic ? ' has-pic' : ''}`,
      `<span class="k" aria-hidden="true">${idx + 1}</span><span class="otext">${pic}<span>${esc(o)}</span></span>`);
    if (item.graded !== null) {
      const right = item.correct.has(o);
      const picked = item.picked.includes(o);
      b.dataset.state = right ? 'right' : picked ? 'wrong' : 'dim';
      // aria-disabled rather than disabled. A disabled button is skipped by the keyboard
      // and announced as "unavailable", which is the one thing somebody does not need to
      // hear after answering - they need to hear which option was right. This keeps the
      // button reachable and gives it a state to report.
      b.setAttribute('aria-disabled', 'true');
      const mark = right
        ? (picked ? t('opt.correctYours') : t('opt.correct'))
        : (picked ? t('opt.yoursIncorrect') : '');
      if (mark) {
        b.appendChild(el('span', 'mark',
          `<span aria-hidden="true">${right ? '\u2713' : '\u2715'}</span> ${esc(mark)}`));
      }
    } else if (item.picked.includes(o)) {
      // Mid-question on a "name two" - the first pick has to show somewhere.
      b.dataset.state = 'picked';
      b.setAttribute('aria-pressed', 'true');
      b.appendChild(el('span', 'mark', esc(t('opt.selected'))));
    } else {
      if (item.expected > 1) b.setAttribute('aria-pressed', 'false');
      b.onclick = () => {
        item.picked.push(o);
        if (item.picked.length >= item.expected) {
          item.graded = item.picked.every((p) => item.correct.has(p));
          if (item.graded) test.correct += 1;
          recordAnswer(item.q, item.graded);
        }
        render();
        // render() rebuilt the pane, which drops focus to the body. Put it on the control
        // that carries on, and send the outcome to the live region instead - focusing the
        // feedback itself would have the two talk over each other.
        if (item.graded !== null) {
          refocus('.next-q');
          announce(verdictFor(item).text);
        } else {
          const still = document.querySelectorAll('.opt')[idx];
          if (still) still.focus();
        }
      };
    }
    opts.appendChild(b);
  });
  card.appendChild(opts);

  if (item.graded !== null) {
    const v = verdictFor(item);
    card.appendChild(el('p', `verdict ${v.cls}`,
      `<b><span aria-hidden="true">${v.glyph}</span> ${esc(v.lead)}</b>${v.rest ? `<span>${esc(v.rest)}</span>` : ''}`));
  }
  pane.appendChild(card);

  if (item.graded !== null) {
    const row = el('div', 'row');
    const next = el('button', 'btn next-q',
      esc(test.at + 1 >= test.items.length ? t('btn.seeResults') : t('btn.nextQuestion')));
    next.onclick = () => {
      test.at += 1;
      render();
      refocus('.opt, .pane .btn');
    };
    row.appendChild(next);
    pane.appendChild(row);
  }
  packAttribution(pane);
}

function renderResults(pane, test) {
  const pct = Math.round((test.correct / test.items.length) * 100);
  const passed = test.correct >= test.pass;
  const hist = store.read().history || [];
  if (!test.saved) {
    test.saved = true;
    store.write({ history: [...hist, { at: Date.now(), pct, passed }].slice(-50) });
  }
  crumb(pane, t('results.crumb'));
  pane.appendChild(el('h2', null, esc(passed ? t('results.pass') : t('results.notYet'))));
  pane.appendChild(el('p', 'sub', esc(t('results.sub', {
    correct: test.correct, total: test.items.length, pct, pass: test.pass,
  }))));

  const missed = test.items.filter((i) => i.graded === false);
  if (missed.length) {
    pane.appendChild(el('h2', null, esc(tn('results.review', missed.length))));
    missed.forEach((m) => {
      const c = el('div', 'card');
      c.style.marginBottom = '12px';
      const official = fixedOptions(m.q);
      c.innerHTML = `<p style="font-weight:600;margin:0 0 8px">${esc(m.q.question)}</p>
        ${questionFigure(m.q)}
        <span class="label">${esc(m.acceptable.length > 1 ? t('study.acceptedAnswers', { n: m.acceptable.length }) : (official ? t('study.correctAnswer') : t('study.answer')))}</span>
        ${acceptsAnyOne(m.q.question, m.acceptable.length) ? `<p style="color:var(--accent-ink);font-size:13px;margin:5px 0 0">${esc(t('study.anyOne'))}</p>` : ''}
        ${official
          ? optionList(official, m.acceptable, m.q)
          : `<ul class="answers">${m.acceptable.map((a) => `<li><span class="tick" aria-hidden="true">\u2713</span><span>${esc(a)}</span></li>`).join('')}</ul>`}
        ${m.q.note ? `<p class="note">${esc(m.q.note)}</p>` : ''}`;
      pane.appendChild(c);
    });
  }
  const row = el('div', 'row');
  const again = el('button', 'btn', esc(t('btn.backToPractice')));
  again.onclick = () => { state.test = null; render(); };
  row.appendChild(again);
  pane.appendChild(row);
  packAttribution(pane);
}

/* ---------- interview: paid ---------- */
function renderInterview(pane) {
  crumb(pane, t('interview.crumb'));
  pane.appendChild(el('h2', null, esc(t('interview.title'))));
  pane.appendChild(el('p', 'sub', esc(t('interview.sub'))));
  if (!isPro()) { paywall(pane, t('interview.title')); return; }

  // A question whose four options are "Bild 1" to "Bild 4" cannot be practised out loud
  // either, so the same exclusion applies.
  const pool = allQuestions().filter((q) => !isLocal(q) && !needsPicture(q));
  const q = pool[Math.floor(Math.random() * pool.length)];
  const options = fixedOptions(q);
  const card = el('div', 'card');
  card.innerHTML = `<span class="label">${esc(t('interview.label'))}</span><p class="q">${esc(q.question)}</p>${questionFigure(q)}`;
  const row = el('div', 'row');
  const say = el('button', 'btn ghost', esc(t('btn.readAloud')));
  say.onclick = () => {
    if (!('speechSynthesis' in window)) { say.textContent = t('interview.noSpeech'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.question);
    /* The pack's language, not en-US. A German question read by an English voice is close
     * to unintelligible, and this was hardcoded to en-US - which would have made the whole
     * mode useless the moment a German pack loaded. */
    u.lang = (state.pack && state.pack.language) || currentLocale();
    speechSynthesis.speak(u);
  };
  const reveal = el('button', 'btn', esc(t('btn.revealAnswer')));
  reveal.onclick = () => {
    reveal.remove();
    // A multiple-choice question is revealed as its options with the right one marked;
    // free text as the list of answers an officer accepts.
    if (options) {
      const box = el('div', null, optionList(options, q.answers || [], q));
      card.appendChild(box);
    } else {
      const list = el('ul', 'answers');
      list.innerHTML = (q.answers || []).map((a) => `<li><span class="tick" aria-hidden="true">\u2713</span><span>${esc(a)}</span></li>`).join('');
      card.appendChild(list);
    }
  };
  const next = el('button', 'btn quiet', esc(t('btn.anotherQuestion')));
  next.onclick = () => { render(); refocus('.btn.quiet'); };
  row.append(say, reveal, next);
  pane.append(card, row);
  pane.appendChild(el('p', 'sub', esc(t('interview.privacy'))));
  packAttribution(pane);
}

/* ---------- performance: the reason to come back ----------
 *
 * Everything drawn here comes from answers actually given. Nothing is estimated, nothing
 * is projected, and there is no invented "readiness score" - the app shipped placeholder
 * numbers once and it will not again (BUILD_PLAN v9).
 *
 * The screen is built so that it looks deliberate before there is any data: the section
 * map is drawn gray rather than hidden, so a new person can see the shape of what they are
 * about to fill in instead of an empty page that reads as a missing feature.
 */

/** The most recent outcome per question, which is what the map colors by - getting a
 *  question right after getting it wrong should show as learned, not as a black mark. */
function latestByQuestion() {
  const out = new Map();
  (store.read().answers || []).forEach((r) => {
    // Keyed as a string, always.
    //
    // Question ids are numbers in the content pack, and putProgress() stores them as
    // strings. So a Map keyed by whatever came back from the server could never be looked
    // up with a pack id, and the map of the test rendered entirely grey for anybody whose
    // progress had been saved and reloaded - which is everybody, after one page load.
    // Section accuracy escaped it only because category ids are strings on both sides.
    const key = String(r.q);
    const prev = out.get(key);
    if (!prev || r.at >= prev.at) out.set(key, r);
  });
  return out;
}

/** Consecutive days up to today with at least one answer. Counted in local time, because
 *  a streak is about the person's days, not UTC's. */
function studyStreak() {
  const days = new Set(
    (store.read().answers || []).map((r) => {
      const d = new Date(r.at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  if (!days.size) return 0;
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const cursor = new Date();
  // A streak should not break just because today has not been studied yet.
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(key(cursor))) { n += 1; cursor.setDate(cursor.getDate() - 1); }
  return n;
}

/** Answers per day for the last 30 days, oldest first. */
function activity(days = 30) {
  const buckets = new Map();
  (store.read().answers || []).forEach((r) => {
    const d = new Date(r.at);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, (buckets.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || 0) + 1);
  });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ date: d, n: buckets.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || 0 });
  }
  return out;
}

/** The accuracy ring. One scale, and the only number on it is one the data reaches.
 *  The pass mark is a tick on that same scale, so "am I above the line" is a glance. */
function accuracyRing(pct, passPct) {
  const R = 52, C = 64, SW = 10;
  const circ = 2 * Math.PI * R;
  const shown = pct === null ? 0 : pct;
  // Three states, and "above or below the line" is only one of them: a pack that does not
  // publish a pass mark gets a ring with no line on it rather than a line at a guessed
  // percentage.
  const ringState = pct === null ? 'none' : passPct === null ? 'ok' : pct >= passPct ? 'ok' : 'low';
  let tickMark = '';
  if (passPct !== null) {
    const a = (passPct / 100) * 2 * Math.PI - Math.PI / 2;
    const tick = [
      C + Math.cos(a) * (R - SW / 2 - 3), C + Math.sin(a) * (R - SW / 2 - 3),
      C + Math.cos(a) * (R + SW / 2 + 3), C + Math.sin(a) * (R + SW / 2 + 3),
    ];
    tickMark = `<line class="ring-tick" x1="${tick[0].toFixed(1)}" y1="${tick[1].toFixed(1)}" x2="${tick[2].toFixed(1)}" y2="${tick[3].toFixed(1)}" stroke-width="2"/>`;
  }
  const label = pct === null
    ? t('perf.ringNone')
    : passPct === null ? t('perf.ringLabelNoMark', { pct }) : t('perf.ringLabel', { pct, passPct });
  return `<svg class="ring is-${ringState}" viewBox="0 0 ${C * 2} ${C * 2}" role="img"
       aria-label="${esc(label)}">
    <circle class="ring-bg" cx="${C}" cy="${C}" r="${R}" fill="none" stroke-width="${SW}"/>
    <circle class="ring-fg" cx="${C}" cy="${C}" r="${R}" fill="none" stroke-width="${SW}" stroke-linecap="round"
            transform="rotate(-90 ${C} ${C})" stroke-dasharray="${(circ * shown / 100).toFixed(1)} ${circ.toFixed(1)}"/>
    ${tickMark}
    <text class="ring-big" x="${C}" y="${C + 1}" text-anchor="middle" dominant-baseline="middle">${pct === null ? '—' : pct + '%'}</text>
    <text class="ring-cap" x="${C}" y="${C + 24}" text-anchor="middle">${esc(t('perf.accuracyCap'))}</text>
  </svg>`;
}

/** The score trend. Drawn after the fill, so the pass line stays visible on top of it. */
function trendChart(recent, passPct) {
  const W = 520, H = 150, PAD = 24;
  const pts = recent.map((h, i) => [
    PAD + (i / (recent.length - 1)) * (W - PAD * 2),
    H - PAD - (h.pct / 100) * (H - PAD * 2),
  ]);
  const line = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - PAD} L${pts[0][0].toFixed(1)} ${H - PAD} Z`;
  const last = pts[pts.length - 1];
  // No pass mark in the pack means no pass line on the chart. Drawing one anyway would be
  // an invented threshold on a screen whose whole promise is that nothing is invented.
  let passLine = '';
  if (passPct !== null) {
    const passY = H - PAD - (passPct / 100) * (H - PAD * 2);
    passLine = `<line class="t-pass" x1="${PAD}" x2="${W - PAD}" y1="${passY.toFixed(1)}" y2="${passY.toFixed(1)}"/>
    <text class="t-cap" x="${PAD}" y="${(passY - 7).toFixed(1)}">${esc(t('perf.passMarkCap', { pct: passPct }))}</text>`;
  }
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img"
       aria-label="${esc(t('perf.trendLabel', { n: recent.length, pct: recent[recent.length - 1].pct }))}">
    <path class="t-area" d="${area}"/>
    <path class="t-line" d="${line}"/>
    ${passLine}
    ${pts.map((pt, i) => `<circle class="t-dot" cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 2.6}"/>`).join('')}
    <text class="t-now" x="${last[0].toFixed(1)}" y="${(last[1] - 11).toFixed(1)}" text-anchor="end">${recent[recent.length - 1].pct}%</text>
  </svg>`;
}

/* ---------- performance: the command deck ----------
 *
 * One screen: the ring and a sentence, a strip of figures, then the map of the test beside
 * the two charts. Chosen from five prototypes.
 *
 * Country-agnostic by construction. Section names, the pass mark and how many questions a
 * test asks all come from the loaded pack, so a country with four sections or twelve lays
 * out the same way and nothing here says "USCIS".
 *
 * Every figure comes from answers actually given. No projected score, no invented
 * readiness number, and a section never attempted is shown as never attempted rather than
 * as zero - see BUILD_PLAN v9 for why that rule exists.
 */
function renderPerformance(pane) {
  const hist = store.read().history || [];
  const log = store.read().answers || [];
  const recent = hist.slice(-9);
  /* From the pack. This was `passRequirement || 12` and `askedPerInterview || 20` - the
     United States' own numbers, standing in for any pack that did not carry its own. On a
     German pack that would have drawn a 60% pass line on a test whose pass mark is 51%. */
  const { passPct } = packFormat();

  const answered = log.length;
  const correct = log.filter((r) => r.ok).length;
  const overall = answered ? Math.round((correct / answered) * 100) : null;
  const latest = latestByQuestion();
  const all = allQuestions();
  const seenPct = all.length ? Math.round((latest.size / all.length) * 100) : 0;
  const streak = studyStreak();
  const acc = sectionAccuracy();
  const attempted = acc.filter((a) => a.pct !== null).sort((a, b) => a.pct - b.pct);
  const untouched = acc.filter((a) => a.pct === null);

  const deck = el('div', 'deck');

  /* ---- the ring, and one sentence that says what it means ---- */
  // Above or below the line is only sayable when there is a line. Without one the sentence
  // states the accuracy and stops, rather than implying a verdict.
  const above = passPct === null ? null : overall >= passPct;
  const weakest = attempted.length
    ? ` ${above === false ? t('perf.startWith', { label: attempted[0].label, pct: attempted[0].pct })
                          : t('perf.weakest', { label: attempted[0].label, pct: attempted[0].pct })}`
    : '';
  const headline = !answered
    ? t('perf.headlineEmpty')
    : passPct === null
      ? `${t('perf.headlineNoMark')}${weakest}`
      : `${t(above ? 'perf.headlineAbove' : 'perf.headlineBelow', { pct: passPct })}${weakest}`;

  const heading = !answered
    ? t('perf.whereYouStand')
    : above === null ? t('perf.whereYouStand') : t(above ? 'perf.onTrack' : 'perf.notThereYet');

  const head = el('div', 'deck-head');
  head.innerHTML = `<div class="deck-ring">${accuracyRing(overall, passPct)}</div>
    <div class="deck-say">
      <p class="label">${esc(t('perf.label'))}</p>
      <h2>${esc(heading)}</h2>
      <p class="deck-sub">${esc(headline)}</p>
    </div>`;
  deck.appendChild(head);

  /* ---- the figures strip ---- */
  const strip = el('div', 'strip');
  strip.innerHTML = [
    [`${seenPct}%`, t('perf.poolSeen')],
    [hist.length || '—', t('perf.testsFinished')],
    [streak || '—', t('perf.dayStreak')],
    [recent.length ? `${recent[recent.length - 1].pct}%` : '—', t('perf.latestScore')],
    [answered || '—', t('perf.answersRecorded')],
  ].map(([v, l]) => `<div class="cell"><b class="mono">${v}</b><span class="label">${esc(l)}</span></div>`).join('');
  deck.appendChild(strip);

  /* ---- three columns: the map, the charts, the sections ---- */
  const cols = el('div', 'deck-cols');

  const mapPanel = el('div', 'panel');
  mapPanel.innerHTML = `<p class="label">${esc(t('perf.map'))}</p>
    <div class="map">${(state.pack.categories || []).map((cat) => {
      const cells = cat.questions.map((q) => {
        const r = latest.get(String(q.id));
        const cls = !r ? 'u' : r.ok ? 'r' : 'w';
        const said = !r ? t('perf.notAskedYet') : r.ok ? t('perf.answeredRight') : t('perf.answeredWrong');
        return `<i class="c ${cls}" title="${esc(`${q.question}\n${said}`)}"></i>`;
      }).join('');
      return `<div class="map-row"><span class="map-name">${esc(sectionLabel(cat))}</span><span class="map-cells">${cells}</span></div>`;
    }).join('')}</div>
    <p class="map-key"><span><i class="c r"></i> ${esc(t('perf.keyRight'))}</span><span><i class="c w"></i> ${esc(t('perf.keyWrong'))}</span><span><i class="c u"></i> ${esc(t('perf.keyUnasked'))}</span></p>`;
  cols.appendChild(mapPanel);

  if (recent.length >= 2) {
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">${esc(t('perf.scores', { n: recent.length }))}</p>${trendChart(recent, passPct)}`;
    cols.appendChild(c);
  }
  const act = activity(30);
  if (act.some((d) => d.n)) {
    const peak = Math.max(...act.map((d) => d.n));
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">${esc(t('perf.answersPerDay', { days: act.length }))}</p>
      <div class="spark">${act.map((d) => {
        const h = d.n ? Math.max(10, Math.round((d.n / peak) * 100)) : 4;
        // The pack's locale, so a German reader gets "7. Sept." rather than "Sep 7".
        const when = d.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });
        return `<i style="height:${h}%" class="${d.n ? 'on' : ''}" title="${esc(d.n ? tn('perf.answersOn', d.n, { when }) : t('perf.nothingOn', { when }))}"></i>`;
      }).join('')}</div>`;
    cols.appendChild(c);
  }
  if (attempted.length) {
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">${esc(t('perf.accuracyBySection'))}</p>`;
    const list = el('div', 'sec-list');
    attempted.forEach((a) => {
      // With no pass mark from the pack there is no "weak", so nothing is coloured as if
      // there were.
      const weak = passPct !== null && a.pct < passPct;
      // The whole row is the control, rather than a separate "Study X" line underneath it.
      // Long section names made that line wrap, which doubled the panel's height and left
      // the column badly out of balance.
      const row = el('button', 'sec');
      row.setAttribute('aria-label', t('perf.studySection', { label: a.label, pct: a.pct }));
      row.innerHTML = `<div class="sec-head">
          <span class="sec-name">${esc(a.label)}</span>
          <span class="mono sec-pct ${weak ? 'is-low' : 'is-ok'}">${a.pct}%</span>
          <span class="sec-arrow" aria-hidden="true">→</span>
        </div>
        <div class="sec-bar"><i style="width:${a.pct}%" class="${weak ? 'is-low' : ''}"></i></div>`;
      row.onclick = () => { state.mode = 'study'; state.topicId = a.id; state.cardIndex = 0; state.revealed = false; renderRail(); render(); };
      list.appendChild(row);
    });
    c.appendChild(list);
    cols.appendChild(c);
  }
  if (untouched.length) {
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">${esc(tn('perf.notTested', untouched.length))}</p>
      <p class="panel-note">${untouched.map((u) => esc(u.label)).join(' · ')}</p>
      <p class="panel-note dim">${esc(t('perf.notTestedNote'))}</p>`;
    cols.appendChild(c);
  }
  deck.appendChild(cols);
  pane.appendChild(deck);

  if (!answered) {
    const row = el('div', 'row');
    const go = el('button', 'btn', esc(t('btn.takeTest')));
    go.onclick = () => { state.mode = 'practice'; state.test = null; store.write({ mode: 'practice' }); renderRail(); render(); };
    row.appendChild(go);
    pane.appendChild(row);
  }
}

/* ---------- insights: site analytics, owner only ----------
 *
 * Rendered in the pane like every other mode, rather than sending the owner off to a
 * separate page. The figures come from /api/analytics, which is the same getOverview()
 * the standalone /insights page uses - so the two cannot disagree.
 *
 * What it deliberately cannot show: there is no visitor identifier anywhere in this
 * product, so these are independent counts rather than one person's journey. "8 checkouts
 * opened" and "59 accounts" are both true; which of those accounts opened a checkout is
 * not knowable, on purpose. See privacy-web.html.
 */
let insightsRange = 28;

function renderInsights(pane) {
  if (!state.me || !state.me.isOwner) {
    // Nothing to show, and no reason to have arrived here.
    state.mode = 'study';
    renderRail();
    render();
    return;
  }

  crumb(pane, t('ins.crumb'));
  const head = el('div', 'ins-head');
  head.innerHTML = `<div><h2>${esc(t('ins.title'))}</h2>
      <p class="sub">${esc(t('ins.sub'))}</p></div>`;
  const ranges = el('div', 'ins-ranges');
  [7, 28, 90].forEach((d) => {
    const b = el('button', 'ins-range', esc(t('ins.range', { n: d })));
    b.setAttribute('aria-pressed', String(d === insightsRange));
    b.onclick = () => { insightsRange = d; render(); };
    ranges.appendChild(b);
  });
  head.appendChild(ranges);
  pane.appendChild(head);

  const body = el('div', 'ins-body');
  body.innerHTML = `<p class="sub">${esc(t('ins.loading'))}</p>`;
  pane.appendChild(body);

  api(`/api/analytics?days=${insightsRange}`)
    .then((d) => drawInsights(body, d))
    .catch((err) => {
      body.innerHTML = '';
      const c = el('div', 'panel');
      c.innerHTML = `<p class="label">${esc(t('ins.notAvailable'))}</p>
        <p class="panel-note">${esc(err.message)}</p>
        <p class="panel-note dim">${esc(t('ins.migrationNote'))}</p>`;
      body.appendChild(c);
    });
}

function drawInsights(body, d) {
  body.innerHTML = '';
  // `totals`, not `t`: `t` is the translation function.
  const totals = d.totals || {};

  const strip = el('div', 'strip');
  strip.innerHTML = [
    [totals.views ?? 0, t('ins.pageViews')],
    [totals.accounts ?? 0, t('ins.accountsCreated')],
    [totals.checkouts ?? 0, t('ins.checkoutsOpened')],
    [totals.payments ?? 0, t('ins.paymentsCompleted')],
    [totals.refunds ?? 0, t('ins.refunds')],
  ].map(([v, l]) => `<div class="cell"><b class="mono">${v}</b><span class="label">${esc(l)}</span></div>`).join('');
  body.appendChild(strip);

  const cols = el('div', 'deck-cols');
  const series = d.series || [];
  if (series.length) {
    const peak = Math.max(...series.map((r) => r.views)) || 1;
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">${esc(t('ins.viewsPerDay', { days: d.days }))}</p>
      <div class="spark">${series.map((r) => {
        const h = r.views ? Math.max(10, Math.round((r.views / peak) * 100)) : 4;
        return `<i style="height:${h}%" class="${r.views ? 'on' : ''}" title="${esc(tn('ins.viewsOn', r.views, { day: r.day }))}"></i>`;
      }).join('')}</div>
      <p class="panel-note dim">${esc(t('ins.rangeNote', { from: d.from, to: d.to, peak }))}</p>`;
    cols.appendChild(c);
  }

  const steps = [
    [t('ins.pageViews'), totals.views ?? 0],
    [t('ins.accountsCreated'), totals.accounts ?? 0],
    [t('ins.checkoutsOpened'), totals.checkouts ?? 0],
    [t('ins.paymentsCompleted'), totals.payments ?? 0],
  ];
  const top = Math.max(...steps.map(([, v]) => v)) || 1;
  const funnel = el('div', 'panel');
  funnel.innerHTML = `<p class="label">${esc(t('ins.howFar'))}</p>
    <div class="fun">${steps.map(([l, v]) => `
      <div class="fun-row">
        <div class="fun-top"><span>${esc(l)}</span><b class="mono">${v}</b></div>
        <div class="fun-bar"><i style="width:${Math.round((v / top) * 100)}%"></i></div>
      </div>`).join('')}</div>
    <p class="panel-note dim">${esc(t('ins.funnelNote'))}</p>`;
  cols.appendChild(funnel);

  const countries = (d.countries || []).slice(0, 12);
  const cc = el('div', 'panel');
  if (countries.length) {
    cc.innerHTML = `<p class="label">${esc(t('ins.whereVisitors'))}</p>
      <div class="ins-table">${countries.map((c) => `
        <div class="ins-row">
          <span class="ins-k">${esc(countryName(c.code))}</span>
          <span class="ins-bar"><i style="width:${Math.round((c.views / (countries[0].views || 1)) * 100)}%"></i></span>
          <b class="mono">${c.views}</b>
        </div>`).join('')}</div>`;
  } else {
    cc.innerHTML = `<p class="label">${esc(t('ins.whereVisitors'))}</p><p class="panel-note">${esc(t('ins.noViews'))}</p>`;
  }
  cols.appendChild(cc);

  const pages = (d.pages || []).slice(0, 12);
  const pc = el('div', 'panel');
  if (pages.length) {
    pc.innerHTML = `<p class="label">${esc(t('ins.mostViewed'))}</p>
      <div class="ins-table">${pages.map((r) => `
        <div class="ins-row">
          <span class="ins-k mono">${esc(r.path)}</span>
          <span class="ins-bar"><i style="width:${Math.round((r.views / (pages[0].views || 1)) * 100)}%"></i></span>
          <b class="mono">${r.views}</b>
        </div>`).join('')}</div>`;
  } else {
    pc.innerHTML = `<p class="label">${esc(t('ins.mostViewed'))}</p><p class="panel-note">${esc(t('ins.nothingRecorded'))}</p>`;
  }
  cols.appendChild(pc);

  const byC = countries.filter((c) => c.accounts || c.checkouts);
  const ac = el('div', 'panel');
  if (byC.length) {
    ac.innerHTML = `<p class="label">${esc(t('ins.accountsCheckouts'))}</p>
      <div class="ins-table">${byC.map((c) => `
        <div class="ins-row three">
          <span class="ins-k">${esc(countryName(c.code))}</span>
          <b class="mono">${c.accounts}</b><b class="mono dim">${c.checkouts}</b>
        </div>`).join('')}</div>
      <p class="panel-note dim">${esc(t('ins.accountsThenCheckouts'))}</p>`;
  } else {
    ac.innerHTML = `<p class="label">${esc(t('ins.accountsCheckouts'))}</p>
      <p class="panel-note">${esc(t('ins.noAccounts'))}</p>`;
  }
  cols.appendChild(ac);

  body.appendChild(cols);

  body.appendChild(excludeMeControl());
}

const OPT_OUT_KEY = 'pfc.noanalytics';
const isExcluded = () => {
  try { return localStorage.getItem(OPT_OUT_KEY) === '1'; } catch { return false; }
};

/** "Don't count my visits", the way PastClimate does it: a flag in this browser.
 *
 *  Per-browser and per-device on purpose. Storing the choice on the account would mean a
 *  server-side record of somebody asking not to be recorded, and would not work when
 *  signed out - which is most of the visits worth excluding. */
function excludeMeControl() {
  const box = el('div', 'panel');
  const on = isExcluded();
  box.innerHTML = `<p class="label">${esc(t('ins.yourVisits'))}</p>`;
  const row = el('div', 'opt-row');
  const btn = el('button', 'opt-toggle');
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(on));
  btn.innerHTML = `<span class="opt-track"><span class="opt-knob"></span></span>
    <span class="opt-text">${esc(t('ins.dontCount'))}</span>`;
  const note = el('p', 'panel-note dim');
  const say = (v) => {
    note.textContent = v ? t('ins.excludedOn') : t('ins.excludedOff');
  };
  btn.onclick = () => {
    const next = !isExcluded();
    try {
      if (next) localStorage.setItem(OPT_OUT_KEY, '1');
      else localStorage.removeItem(OPT_OUT_KEY);
    } catch {}
    btn.setAttribute('aria-checked', String(next));
    say(next);
  };
  say(on);
  row.appendChild(btn);
  box.append(row, note);
  return box;
}

/** A readable country name where we know one, the ISO code otherwise. Deliberately partial:
 *  this is a label on a bar, not a gazetteer, and an unknown code is still useful. */
const COUNTRY_NAMES = {
  US: 'United States', IN: 'India', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', IE: 'Ireland',
  MX: 'Mexico', BR: 'Brazil', PH: 'Philippines', PK: 'Pakistan', BD: 'Bangladesh',
  NG: 'Nigeria', ZA: 'South Africa', CN: 'China', JP: 'Japan', KR: 'South Korea',
  VN: 'Vietnam', TH: 'Thailand', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  PL: 'Poland', PT: 'Portugal', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  CH: 'Switzerland', AT: 'Austria', BE: 'Belgium', NZ: 'New Zealand', SG: 'Singapore',
  CO: 'Colombia', AR: 'Argentina', CL: 'Chile', PE: 'Peru', UA: 'Ukraine', TR: 'Turkey',
  RU: 'Russia', EG: 'Egypt', KE: 'Kenya', GH: 'Ghana', ET: 'Ethiopia', NP: 'Nepal',
  LK: 'Sri Lanka', ID: 'Indonesia', MY: 'Malaysia', HK: 'Hong Kong', TW: 'Taiwan',
};
const countryName = (code) => COUNTRY_NAMES[code] || code || 'Unknown';

/** Surfaces a checkout failure on our own page. Paddle's overlay says "something went
 *  wrong" and offers to contact Paddle's support, which is not who can help with a problem
 *  at our end. */
function showCheckoutError(detail) {
  const msg = document.querySelector('.pay-msg');
  if (!msg) return;
  msg.hidden = false;
  msg.className = 'pay-msg bad';
  msg.textContent = t('checkout.failed', { detail });
}

function paywall(pane, what) {
  const box = el('div', 'card locked');
  box.innerHTML = `<div class="disc">🔓</div>
    <h3>${esc(t('paywall.title', { what }))}</h3>
    <p>${esc(t('paywall.body'))}</p>
    <p class="price">${PRICE}</p>
    <p class="label">${esc(t('paywall.oneTime'))}</p>
    <p class="pay-note" style="margin-top:6px">${esc(t('paywall.tax'))}</p>`;

  const row = el('div', 'row');
  row.style.justifyContent = 'center';
  const buy = el('button', 'btn', esc(t('paywall.unlockFor', { price: PRICE })));
  const msg = el('p', 'pay-msg');
  msg.hidden = true;

  const paddleCfg = state.config && state.config.paddle;
  if (!paddleCfg || !paddleCfg.configured || paddleCfg.salesPaused) {
    // Honest about it rather than a button that opens a checkout and fails. Two reasons
    // land here: the keys are not set yet, or they are set but Paddle has not finished
    // approving the account, which it refuses checkouts for.
    buy.disabled = true;
    buy.textContent = t('paywall.notOnSale');
    msg.hidden = false;
    msg.textContent = paddleCfg && paddleCfg.salesPaused
      ? t('paywall.salesPaused')
      : t('paywall.notConfigured');
  }

  buy.onclick = async () => {
    msg.hidden = true;
    msg.className = 'pay-msg';
    buy.disabled = true;
    buy.textContent = t('paywall.opening');
    try {
      // The server hands over the price and stamps the account id on the transaction, so
      // the webhook knows whose access to unlock.
      const checkout = await api('/api/checkout', { method: 'POST' });
      if (!initPaddle(checkout)) throw new Error(t('paywall.windowFailed'));

      // Watch for the entitlement regardless of what the overlay does next.
      //
      // The fast path is Paddle's checkout.completed event, and the webhook is the
      // backstop that grants access even if the browser goes away. But there was a gap
      // between them: if the event does not arrive - overlay left open, event missed,
      // no redirect - the webhook grants access and the page never finds out, so somebody
      // who has just paid keeps looking at the paywall until they think to reload. This
      // closes it by asking the server, which is the only thing entitled to answer.
      markPurchaseInFlight();
      watchForAccess();

      Paddle.Checkout.open({
        items: [{ priceId: checkout.priceId, quantity: 1 }],
        customer: { email: checkout.customer.email },
        customData: checkout.customData,
        settings: {
          displayMode: 'overlay',
          theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          // Deliberately no successUrl.
          //
          // With one set, Paddle navigates the whole page the instant the payment
          // completes - which killed the confirmation that had just started, discarded the
          // watcher, and arrived back without the transaction reference. So the page then
          // sat on the paywall while the webhook quietly granted access behind it.
          //
          // Without it the overlay shows its own success panel, the page stays put, and
          // checkout.completed plus the watcher below do the work.
        },
      });
      buy.textContent = t('paywall.unlockFor', { price: PRICE });
      buy.disabled = false;
    } catch (err) {
      msg.hidden = false;
      msg.className = 'pay-msg bad';
      msg.textContent = err.message;
      buy.textContent = t('paywall.unlockFor', { price: PRICE });
      buy.disabled = false;
    }
  };

  row.appendChild(buy);
  box.appendChild(row);
  box.appendChild(msg);
  // The one string in the set that carries markup, because the two links belong inside the
  // sentence. Every translation of it holds the same two hrefs.
  box.appendChild(el('p', 'pay-note', t('paywall.footer')));
  pane.appendChild(box);
}

/* A purchase in flight, remembered across a reload.
 *
 * The page can be replaced at any point after somebody pays - Paddle navigating, a manual
 * refresh, a flaky connection. Any of those loses an in-memory watcher, and then the
 * webhook grants access to a page that has stopped looking. So the fact that a checkout
 * was opened is written down, and boot() picks the watch back up. */
const PURCHASE_KEY = 'pfc.purchasing';
function markPurchaseInFlight() {
  try { sessionStorage.setItem(PURCHASE_KEY, String(Date.now())); } catch {}
}
function purchaseInFlight() {
  try {
    const at = Number(sessionStorage.getItem(PURCHASE_KEY));
    // Ten minutes. Long enough for a slow bank, short enough that an abandoned checkout
    // does not leave the app polling for the rest of the session.
    return !!at && Date.now() - at < 10 * 60 * 1000;
  } catch { return false; }
}
const clearPurchaseInFlight = () => { try { sessionStorage.removeItem(PURCHASE_KEY); } catch {} };

/** Polls /api/me until paid access appears, then re-renders. Started when a checkout is
 *  opened and stopped as soon as it succeeds, the tab goes away, or three minutes pass -
 *  by which time Paddle's webhook has either arrived or something is genuinely wrong. */
let accessWatch = null;
function watchForAccess() {
  if (accessWatch) return;
  const started = Date.now();
  accessWatch = setInterval(async () => {
    if (Date.now() - started > 3 * 60 * 1000) { clearInterval(accessWatch); accessWatch = null; return; }
    try {
      const { user } = await api('/api/me');
      state.me = user;
      if (!isPro()) return;
      clearInterval(accessWatch);
      accessWatch = null;
      clearPurchaseInFlight();
      // Land them on the thing they just paid for rather than a re-drawn paywall.
      state.mode = state.mode === 'study' ? 'interview' : state.mode;
      store.write({ mode: state.mode });
      history.replaceState(null, '', '/app');
      renderRail();
      render();
    } catch {
      // A failed poll is not worth telling anyone about; the next one is 3 seconds away.
    }
  }, 3000);
}

/* ---------- after a purchase ---------- */

/** Turns a completed payment into unlocked screens.
 *
 * The server does the deciding: it asks Paddle about the transaction and grants access on
 * Paddle's answer. All this does is ask, wait while a card is still processing, and - if
 * the confirmation genuinely has not landed - say so honestly rather than leaving somebody
 * who has just paid looking at a paywall with no explanation. */
async function confirmPurchase(transactionId) {
  const pane = $('#pane');
  pane.innerHTML = '';
  pane.appendChild(el('h2', null, esc(t('confirm.title'))));
  const note = el('p', 'sub', esc(t('confirm.sub')));
  pane.appendChild(note);

  const settle = () => {
    // Drop the transaction reference from the address bar so a reload does not look like
    // a second purchase.
    history.replaceState(null, '', '/app');
    renderRail();
    render();
  };

  for (let attempt = 0; attempt < 12; attempt++) {
    let answered = null;
    try {
      answered = transactionId
        ? await api('/api/checkout/confirm', { method: 'POST', body: { transactionId } })
        : { user: (await api('/api/me')).user };
    } catch (err) {
      if (err.message === 'signed out') return;
      // A 503 means the server cannot confirm directly - fall back to asking who we are,
      // which the webhook will have updated.
      answered = { user: (await api('/api/me').catch(() => ({ user: state.me }))).user };
    }

    state.me = answered.user || state.me;
    if (isPro()) {
      state.mode = 'interview';
      store.write({ mode: state.mode });
      settle();
      return;
    }
    if (answered.status && answered.status !== 'completed') {
      note.textContent = t('confirm.waiting');
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  note.textContent = t('confirm.stuck');
  const row = el('div', 'row');
  const again = el('button', 'btn', esc(t('btn.checkAgain')));
  again.onclick = () => confirmPurchase(transactionId);
  const help = el('a', 'btn ghost', esc(t('btn.contactSupport')));
  help.href = '/support';
  help.style.textDecoration = 'none';
  row.append(again, help);
  pane.appendChild(row);
}

boot()
  .then(() => {
    // Coming back from Paddle's checkout. Kept out of boot() so a plain visit never waits
    // on it.
    if (isPro()) { clearPurchaseInFlight(); return; }
    // Paddle sometimes returns with the transaction reference, which lets the server
    // confirm immediately instead of waiting for the webhook.
    const ptxn = new URLSearchParams(location.search).get('_ptxn');
    if (ptxn) { confirmPurchase(ptxn); return; }
    // No reference, but a checkout was opened in this tab: keep watching.
    if (purchaseInFlight()) watchForAccess();
  })
  .catch((err) => {
    if (err.message === 'signed out') return; // already redirecting to /login
    $('#booting').hidden = true;
    $('#gate').hidden = true;
    $('#shell').hidden = false;
    $('#pane').innerHTML = `<h2>${esc(t('error.bootTitle'))}</h2>
      <p class="sub">${esc(err.message)}</p>
      <p class="sub"><a href="/app">${esc(t('error.tryAgain'))}</a> · <a href="/support">${esc(t('btn.contactSupport'))}</a></p>`;
  });
