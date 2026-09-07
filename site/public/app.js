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

/* COUNTRIES comes from /countries.js, loaded before this file. */

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

/** Questions whose answer depends on where you live can't be graded without that
 *  detail, so they're excluded from tests until local answers are wired up. */
const isLocal = (q) => (q.answers || []).includes('Answers will vary.');

/** "Name two..." style questions genuinely need more than one pick. The definite article
 *  is the deciding signal: "name THE two parts" is one composite answer. */
function expectedCount(question, acceptableLen) {
  if (/\bone of\b/i.test(question)) return 1;
  if (/\b(?:the|its|their)\s+(?:two|three)\b/i.test(question)) return 1;
  const m = question.match(/(?:^|[.!?]\s+)(?:name|list|give|what are)\s+(two|three)\b/i);
  if (!m) return 1;
  const n = m[1].toLowerCase() === 'two' ? 2 : 3;
  return acceptableLen >= n ? n : 1;
}
function acceptsAnyOne(question, count) {
  if (count <= 3) return false;
  return /\bname one\b|\bone example\b|\bone reason\b|\bone state\b|\bone power\b|\bone thing\b|\bname five\b|\bname three\b/i.test(question);
}

const allQuestions = () => (state.pack.categories || []).flatMap((c) => c.questions);
const categoryOf = (id) => (state.pack.categories || []).find((c) => c.questions.some((q) => q.id === id));
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
      label: subsection(cat.subsection),
      section: titleCase(cat.section),
      total: cat.questions.length,
      seen: d ? d.seen : 0,
      ok: d ? d.ok : 0,
      pct: d && d.seen ? Math.round((d.ok / d.seen) * 100) : null,
    };
  });
}
const usedFreeTest = () => (store.read().history || []).length >= 1;

/* ------------------------------------------------------------------ country gate */
function renderGate() {
  const box = $('#countries');
  box.innerHTML = '';
  COUNTRIES.forEach((c) => {
    const b = el('button', 'country');
    b.disabled = !c.ready;
    b.innerHTML = `<span class="flag">${c.flag}</span>
      <span><b>${esc(c.name)}</b><small>${esc(c.test)}</small></span>
      ${c.ready ? '' : '<span class="label soon">Coming</span>'}`;
    b.addEventListener('click', () => pickCountry(c.code));
    box.appendChild(b);
  });
  $('#gateNote').textContent =
    'Only the United States is live today. The others are listed so you can see where this is going — each one is a content pack, not a different website.';
}

/** Locks the country to the account, server-side. The gate is only ever shown to an
 *  account that has none, so this is a first-time write - the server refuses a change. */
async function pickCountry(code) {
  const note = $('#gateNote');
  document.querySelectorAll('.country').forEach((b) => { b.disabled = true; });
  note.textContent = 'Setting up your questions…';
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
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  const label = btn.querySelector('.theme-label');
  if (label) label.textContent = dark ? 'Light' : 'Dark';
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

async function loadPack(country, versionId) {
  const version = (country.versions || []).find((v) => v.id === versionId) || country.versions[0];
  const res = await fetch(`/content/${country.code}/${version.file}`);
  if (!res.ok) throw new Error(`content pack missing for ${country.code}`);
  const pack = await resolveDynamicAnswers(await res.json(), country.code);
  return { pack, versionId: version.id };
}

/** Runs once. The page itself is already behind the sign-in wall - the Worker will not
 *  serve /app without a session - so this is not the gate, it is where we find out *which*
 *  account we are and what it is allowed to see. */
async function boot() {
  if (!state.me) {
    const [{ user }, config] = await Promise.all([
      api('/api/me'),
      api('/api/config').catch(() => ({ google: false, paddle: { configured: false } })),
    ]);
    state.me = user;
    state.config = config;
    initTheme();
    // Only the owner can open /insights; everyone else gets a 404 from it.
    const insights = $('#insightsLink');
    if (insights) insights.hidden = !user.isOwner;
    if (config.paddle && config.paddle.environment === 'sandbox' && config.paddle.configured) {
      showSandboxBanner();
    }
  }

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
  const bar = el('div', 'sandbox', 'Paddle sandbox — payments on this page are tests, no money moves.');
  document.body.prepend(bar);
}

/* ------------------------------------------------------------------ rail */
function renderRail() {
  const c = state.country;
  const v = c.versions.find((x) => x.id === state.versionId);
  $('#picked').innerHTML = `<span class="flag">${c.flag}</span>
    <span><b>${esc(c.name)}</b><small>${esc(v.label)}</small></span>`;

  renderVersions(c);

  document.querySelectorAll('.mode[data-mode]').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.mode === state.mode));
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
  all.innerHTML = 'All sections';
  all.setAttribute('aria-current', String(!state.topicId));
  all.onclick = () => { state.topicId = null; state.cardIndex = 0; state.revealed = false; renderRail(); render(); };
  topics.appendChild(all);
  (state.pack.categories || []).forEach((cat) => {
    const b = el('button', 'topic');
    b.innerHTML = esc(subsection(cat.subsection));
    b.setAttribute('aria-current', String(state.topicId === cat.id));
    b.onclick = () => { state.topicId = cat.id; state.cardIndex = 0; state.revealed = false; renderRail(); render(); };
    topics.appendChild(b);
  });

  // Who is signed in, and the country they are locked to. Shown rather than hidden in a
  // menu: on a shared computer it should be obvious whose progress is on screen.
  $('#who').innerHTML = `<b>${esc(state.me.name || state.me.email)}</b>
    <small>${esc(state.me.name ? state.me.email : (isPro() ? 'Full access' : 'Free account'))}</small>`;

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
  box.setAttribute('aria-label', `Which version of the ${country.test} to study`);
  box.innerHTML = '';
  versions.forEach((v) => {
    const b = el('button', 'ver', esc(v.label));
    b.setAttribute('aria-pressed', String(v.id === state.versionId));
    b.onclick = () => switchVersion(v.id);
    box.appendChild(b);
  });
  $('#versionNote').textContent = 'Study the version that applies to your own application.';
}

/** Switches question pool. Loads the other pack first, then drops what belonged to the old
 *  one: the section filter, the card position and any test in progress, whose questions came
 *  from the other pool. Answers already recorded stay - each is stamped with the section it
 *  was given in. The choice goes through store.write, so it syncs to the account and the
 *  next visit starts on the same version. */
async function switchVersion(versionId) {
  if (versionId === state.versionId) return;
  if (state.test && !testFinished(state.test)
      && !confirm('Switching test version discards the practice test you have in progress. Continue?')) return;

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
    announce(`Now studying the ${v ? v.label : versionId}.`);
  } catch {
    // Nothing was replaced, so say so rather than leaving a dead picker.
    buttons.forEach((b) => { b.disabled = false; });
    $('#versionNote').textContent = 'That version could not be loaded. You are still on the one you were using.';
  }
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
function renderStudy(pane) {
  const cat = (state.pack.categories || []).find((c) => c.id === state.topicId);
  const pool = cat ? cat.questions : allQuestions();
  crumb(pane, cat ? `${titleCase(cat.section)} › ${subsection(cat.subsection)}` : 'All sections · free forever');
  pane.appendChild(el('h2', null, cat ? esc(subsection(cat.subsection)) : 'Flashcards'));
  pane.appendChild(el('p', 'sub', 'Every official question, free forever. Click the card to see the accepted answers.'));

  if (!pool.length) { pane.appendChild(el('div', 'card', '<p>No questions in this section.</p>')); return; }
  const i = state.cardIndex % pool.length;
  const q = pool[i];
  const answers = q.answers || [];

  const prog = el('div', 'progress', `<i style="width:${Math.max(2, ((i + 1) / pool.length) * 100)}%"></i>`);
  pane.appendChild(prog);

  const wrap = el('button', 'flip');
  // A toggle, and it has to say so: without aria-expanded the card is a button whose label
  // silently changes from a question to a list of answers.
  wrap.setAttribute('aria-expanded', String(state.revealed));
  const card = el('div', 'card');
  if (!state.revealed) {
    card.innerHTML = `<span class="label">Question ${q.id}</span>
      <p class="q">${esc(q.question)}</p>
      <p class="label" style="margin-top:18px">Click to reveal</p>`;
  } else {
    const many = answers.length > 1;
    card.innerHTML = `<span class="label">${many ? `Accepted answers \u00b7 ${answers.length}` : 'Answer'}</span>
      ${acceptsAnyOne(q.question, answers.length) ? '<p style="color:var(--accent-ink);font-size:13.5px;margin:6px 0 0">Any one of these is accepted.</p>' : ''}
      <ul class="answers">${answers.map((a) => `<li><span class="tick" aria-hidden="true">\u2713</span><span>${esc(a)}</span></li>`).join('')}</ul>
      ${q.note ? `<p class="note">${esc(q.note)}</p>` : ''}
      <p class="label" style="margin-top:16px">Click to go back</p>`;
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
  const prev = el('button', 'btn ghost', 'Previous');
  prev.onclick = () => { state.cardIndex = (i - 1 + pool.length) % pool.length; state.revealed = false; render(); refocus('.btn.ghost'); };
  const next = el('button', 'btn', 'Next question');
  next.onclick = () => { state.cardIndex = (i + 1) % pool.length; state.revealed = false; render(); refocus('.row .btn:not(.ghost)'); };
  row.append(prev, next);
  // Position without a total: enough to know where you are, without publishing how
  // many questions the pool holds.
  row.appendChild(el('span', 'label', `Card ${i + 1}`));
  pane.appendChild(row);
}

/* ---------- practice: first test free, then paid ---------- */
function buildTest(count) {
  const pool = allQuestions().filter((q) => !isLocal(q));
  return shuffle(pool).slice(0, Math.min(count, pool.length)).map((q) => {
    const acceptable = q.answers || [];
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
const testFinished = (t) => t.at >= t.items.length;

/** The outcome of a graded question, in words. Built in one place so the sentence drawn on
 *  the card and the sentence announced to a screen reader cannot drift apart. */
function verdictFor(item) {
  const answers = [...item.correct];
  const lead = item.graded ? 'Correct.' : 'Not correct.';
  // A right answer to a one-answer question needs no restatement; anything else does.
  const rest = item.graded && answers.length === 1
    ? ''
    : `The answer${answers.length > 1 ? 's are' : ' is'} ${answers.join('; ')}.`;
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
function renderPausedTest(pane, t) {
  crumb(pane, 'Practice test');
  pane.appendChild(el('h2', null, 'You have a test in progress'));
  pane.appendChild(el('p', 'sub',
    `Paused at question ${t.at + 1} of ${t.items.length}. Nothing you have answered is lost.`));
  pane.appendChild(el('div', 'progress', `<i style="width:${(t.at / t.items.length) * 100}%"></i>`));

  const card = el('div', 'card');
  card.innerHTML = `<span class="label">Paused</span>
    <p class="q">Question ${t.at + 1} of ${t.items.length}</p>
    <p style="color:var(--ink-2);margin:10px 0 0">${t.correct} correct so far \u00b7 ${t.pass} needed to pass.</p>`;
  pane.appendChild(card);

  const row = el('div', 'row');
  const go = el('button', 'btn', 'Resume test');
  go.onclick = () => {
    t.paused = false;
    render();
    refocus('.opt');
  };
  const drop = el('button', 'btn ghost', 'Discard and start a new test');
  drop.onclick = () => { state.test = null; render(); };
  row.append(go, drop);
  pane.appendChild(row);
  if (!isPro() && !usedFreeTest()) {
    pane.appendChild(el('p', 'pay-note', 'This is your free test. Resuming picks it up where you left off.'));
  }
}

function renderPractice(pane) {
  const asked = state.pack.askedPerInterview || 10;
  const pass = state.pack.passRequirement || Math.ceil(asked * 0.6);
  const version = (state.country.versions || []).find((v) => v.id === state.versionId);

  if (state.test && state.test.paused && !testFinished(state.test)) return renderPausedTest(pane, state.test);

  if (!state.test) {
    crumb(pane, 'Practice test');
    pane.appendChild(el('h2', null, 'Practice test'));
    pane.appendChild(el('p', 'sub',
      `In the real interview you're asked up to ${asked} questions and need ${pass} correct to pass. This test uses the same format.`));

    if (usedFreeTest() && !isPro()) { paywall(pane, 'Unlimited practice tests'); return; }

    const card = el('div', 'card');
    card.innerHTML = `<span class="label">${esc(state.country.name)}${version ? ` \u00b7 ${esc(version.label)}` : ''}</span>
      <p class="q">${asked} questions \u00b7 ${pass} to pass</p>
      <p style="color:var(--ink-2);margin:10px 0 0">${usedFreeTest() ? 'Unlimited tests are part of your access.' : 'Your first full test is free.'}</p>`;
    pane.appendChild(card);
    const row = el('div', 'row');
    const go = el('button', 'btn', 'Start test');
    go.onclick = () => { state.test = { items: buildTest(asked), at: 0, correct: 0, pass }; render(); };
    row.appendChild(go);
    pane.appendChild(row);
    return;
  }

  const t = state.test;
  if (testFinished(t)) return renderResults(pane, t);

  const item = t.items[t.at];
  crumb(pane, `Question ${t.at + 1} of ${t.items.length}`);
  pane.appendChild(el('div', 'progress', `<i style="width:${((t.at) / t.items.length) * 100}%"></i>`));

  const instruction = item.expected > 1 ? `Select ${item.expected} answers` : 'Select one answer';
  const card = el('div', 'card');
  card.innerHTML = `<span class="label">${instruction}</span>
    <p class="q">${esc(item.q.question)}</p>`;
  const opts = el('div', 'opts');
  // Named as a group, so the options are announced as the answers to this question rather
  // than as four loose buttons somewhere on a page.
  opts.setAttribute('role', 'group');
  opts.setAttribute('aria-label', `${instruction}: ${item.q.question}`);
  item.options.forEach((o, idx) => {
    // The number is a visual anchor, not a shortcut: read out before every option it is
    // just noise.
    const b = el('button', 'opt', `<span class="k" aria-hidden="true">${idx + 1}</span><span>${esc(o)}</span>`);
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
        ? (picked ? 'Correct, your answer' : 'Correct answer')
        : (picked ? 'Your answer, incorrect' : '');
      if (mark) {
        b.appendChild(el('span', 'mark',
          `<span aria-hidden="true">${right ? '\u2713' : '\u2715'}</span> ${mark}`));
      }
    } else if (item.picked.includes(o)) {
      // Mid-question on a "name two" - the first pick has to show somewhere.
      b.dataset.state = 'picked';
      b.setAttribute('aria-pressed', 'true');
      b.appendChild(el('span', 'mark', 'Selected'));
    } else {
      if (item.expected > 1) b.setAttribute('aria-pressed', 'false');
      b.onclick = () => {
        item.picked.push(o);
        if (item.picked.length >= item.expected) {
          item.graded = item.picked.every((p) => item.correct.has(p));
          if (item.graded) t.correct += 1;
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
    const next = el('button', 'btn next-q', t.at + 1 >= t.items.length ? 'See results' : 'Next question');
    next.onclick = () => {
      t.at += 1;
      render();
      refocus('.opt, .pane .btn');
    };
    row.appendChild(next);
    pane.appendChild(row);
  }
}

function renderResults(pane, t) {
  const pct = Math.round((t.correct / t.items.length) * 100);
  const passed = t.correct >= t.pass;
  const hist = store.read().history || [];
  if (!t.saved) {
    t.saved = true;
    store.write({ history: [...hist, { at: Date.now(), pct, passed }].slice(-50) });
  }
  crumb(pane, 'Results');
  pane.appendChild(el('h2', null, passed ? 'Pass' : 'Not yet'));
  pane.appendChild(el('p', 'sub', `${t.correct} of ${t.items.length} correct (${pct}%) — you needed ${t.pass} to pass.`));

  const missed = t.items.filter((i) => i.graded === false);
  if (missed.length) {
    pane.appendChild(el('h2', null, `Review the ${missed.length} you missed`));
    missed.forEach((m) => {
      const c = el('div', 'card');
      c.style.marginBottom = '12px';
      c.innerHTML = `<p style="font-weight:600;margin:0 0 8px">${esc(m.q.question)}</p>
        <span class="label">${m.acceptable.length > 1 ? `Accepted answers · ${m.acceptable.length}` : 'Answer'}</span>
        ${acceptsAnyOne(m.q.question, m.acceptable.length) ? '<p style="color:var(--accent-ink);font-size:13px;margin:5px 0 0">Any one of these is accepted.</p>' : ''}
        <ul class="answers">${m.acceptable.map((a) => `<li><span class="tick" aria-hidden="true">✓</span><span>${esc(a)}</span></li>`).join('')}</ul>
        ${m.q.note ? `<p class="note">${esc(m.q.note)}</p>` : ''}`;
      pane.appendChild(c);
    });
  }
  const row = el('div', 'row');
  const again = el('button', 'btn', 'Back to practice');
  again.onclick = () => { state.test = null; render(); };
  row.appendChild(again);
  pane.appendChild(row);
}

/* ---------- interview: paid ---------- */
function renderInterview(pane) {
  crumb(pane, 'Interview');
  pane.appendChild(el('h2', null, 'Interview practice'));
  pane.appendChild(el('p', 'sub', 'The question is read aloud, the way the officer will ask it. You answer out loud, then check yourself.'));
  if (!isPro()) { paywall(pane, 'Interview practice'); return; }

  const pool = allQuestions().filter((q) => !isLocal(q));
  const q = pool[Math.floor(Math.random() * pool.length)];
  const card = el('div', 'card');
  card.innerHTML = `<span class="label">Practice interviewer</span><p class="q">${esc(q.question)}</p>`;
  const row = el('div', 'row');
  const say = el('button', 'btn ghost', 'Read it aloud');
  say.onclick = () => {
    if (!('speechSynthesis' in window)) { say.textContent = 'Speech not supported here'; return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.question);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  };
  const reveal = el('button', 'btn', 'Reveal the answer');
  reveal.onclick = () => {
    reveal.remove();
    const list = el('ul', 'answers');
    list.innerHTML = (q.answers || []).map((a) => `<li><span class="tick" aria-hidden="true">✓</span><span>${esc(a)}</span></li>`).join('');
    card.appendChild(list);
  };
  const next = el('button', 'btn quiet', 'Another question');
  next.onclick = () => { render(); refocus('.btn.quiet'); };
  row.append(say, reveal, next);
  pane.append(card, row);
  pane.appendChild(el('p', 'sub', 'Your browser speaks the question. The microphone is never used and no audio is recorded.'));
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
  const state = pct === null ? 'none' : pct >= passPct ? 'ok' : 'low';
  const a = (passPct / 100) * 2 * Math.PI - Math.PI / 2;
  const tick = [
    C + Math.cos(a) * (R - SW / 2 - 3), C + Math.sin(a) * (R - SW / 2 - 3),
    C + Math.cos(a) * (R + SW / 2 + 3), C + Math.sin(a) * (R + SW / 2 + 3),
  ];
  return `<svg class="ring is-${state}" viewBox="0 0 ${C * 2} ${C * 2}" role="img"
       aria-label="${pct === null ? 'No answers recorded yet' : `Accuracy ${pct} percent, pass mark ${passPct} percent`}">
    <circle class="ring-bg" cx="${C}" cy="${C}" r="${R}" fill="none" stroke-width="${SW}"/>
    <circle class="ring-fg" cx="${C}" cy="${C}" r="${R}" fill="none" stroke-width="${SW}" stroke-linecap="round"
            transform="rotate(-90 ${C} ${C})" stroke-dasharray="${(circ * shown / 100).toFixed(1)} ${circ.toFixed(1)}"/>
    <line class="ring-tick" x1="${tick[0].toFixed(1)}" y1="${tick[1].toFixed(1)}" x2="${tick[2].toFixed(1)}" y2="${tick[3].toFixed(1)}" stroke-width="2"/>
    <text class="ring-big" x="${C}" y="${C + 1}" text-anchor="middle" dominant-baseline="middle">${pct === null ? '—' : pct + '%'}</text>
    <text class="ring-cap" x="${C}" y="${C + 24}" text-anchor="middle">ACCURACY</text>
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
  const passY = H - PAD - (passPct / 100) * (H - PAD * 2);
  const last = pts[pts.length - 1];
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img"
       aria-label="Your last ${recent.length} scores, oldest first, most recent ${recent[recent.length - 1].pct} percent">
    <path class="t-area" d="${area}"/>
    <path class="t-line" d="${line}"/>
    <line class="t-pass" x1="${PAD}" x2="${W - PAD}" y1="${passY.toFixed(1)}" y2="${passY.toFixed(1)}"/>
    <text class="t-cap" x="${PAD}" y="${(passY - 7).toFixed(1)}">${passPct}% pass mark</text>
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
  const pass = state.pack.passRequirement || 12;
  const asked = state.pack.askedPerInterview || 20;
  const passPct = Math.round((pass / asked) * 100);

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
  const headline = !answered
    ? 'Nothing here is estimated. Answer a question and this fills in with your own results.'
    : overall >= passPct
      ? `You are answering above the ${passPct}% pass mark.${attempted.length ? ` Weakest: ${attempted[0].label} at ${attempted[0].pct}%.` : ''}`
      : `You are below the ${passPct}% pass mark.${attempted.length ? ` Start with ${attempted[0].label}, at ${attempted[0].pct}%.` : ''}`;

  const head = el('div', 'deck-head');
  head.innerHTML = `<div class="deck-ring">${accuracyRing(overall, passPct)}</div>
    <div class="deck-say">
      <p class="label">Performance</p>
      <h2>${answered ? (overall >= passPct ? 'On track' : 'Not there yet') : 'Where you stand'}</h2>
      <p class="deck-sub">${esc(headline)}</p>
    </div>`;
  deck.appendChild(head);

  /* ---- the figures strip ---- */
  const strip = el('div', 'strip');
  strip.innerHTML = [
    [`${seenPct}%`, 'Of the pool seen'],
    [hist.length || '—', 'Tests finished'],
    [streak || '—', 'Day streak'],
    [recent.length ? `${recent[recent.length - 1].pct}%` : '—', 'Latest score'],
    [answered || '—', 'Answers recorded'],
  ].map(([v, l]) => `<div class="cell"><b class="mono">${v}</b><span class="label">${l}</span></div>`).join('');
  deck.appendChild(strip);

  /* ---- three columns: the map, the charts, the sections ---- */
  const cols = el('div', 'deck-cols');

  const mapPanel = el('div', 'panel');
  mapPanel.innerHTML = `<p class="label">Your map of the test</p>
    <div class="map">${(state.pack.categories || []).map((cat) => {
      const cells = cat.questions.map((q) => {
        const r = latest.get(String(q.id));
        const cls = !r ? 'u' : r.ok ? 'r' : 'w';
        return `<i class="c ${cls}" title="${esc(`${q.question}\n${!r ? 'Not asked yet' : r.ok ? 'Answered correctly' : 'Answered wrongly'}`)}"></i>`;
      }).join('');
      return `<div class="map-row"><span class="map-name">${esc(subsection(cat.subsection))}</span><span class="map-cells">${cells}</span></div>`;
    }).join('')}</div>
    <p class="map-key"><span><i class="c r"></i> right</span><span><i class="c w"></i> wrong</span><span><i class="c u"></i> not asked yet</span></p>`;
  cols.appendChild(mapPanel);

  if (recent.length >= 2) {
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">Scores · last ${recent.length}</p>${trendChart(recent, passPct)}`;
    cols.appendChild(c);
  }
  const act = activity(30);
  if (act.some((d) => d.n)) {
    const peak = Math.max(...act.map((d) => d.n));
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">Answers per day · 30</p>
      <div class="spark">${act.map((d) => {
        const h = d.n ? Math.max(10, Math.round((d.n / peak) * 100)) : 4;
        const when = d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        return `<i style="height:${h}%" class="${d.n ? 'on' : ''}" title="${esc(d.n ? `${d.n} answer${d.n === 1 ? '' : 's'} on ${when}` : `Nothing on ${when}`)}"></i>`;
      }).join('')}</div>`;
    cols.appendChild(c);
  }
  if (attempted.length) {
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">Accuracy by section · weakest first</p>`;
    const list = el('div', 'sec-list');
    attempted.forEach((a) => {
      const weak = a.pct < passPct;
      // The whole row is the control, rather than a separate "Study X" line underneath it.
      // Long section names made that line wrap, which doubled the panel's height and left
      // the column badly out of balance.
      const row = el('button', 'sec');
      row.setAttribute('aria-label', `Study ${a.label}, currently ${a.pct}% correct`);
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
    c.innerHTML = `<p class="label">Not tested yet · ${untouched.length} section${untouched.length === 1 ? '' : 's'}</p>
      <p class="panel-note">${untouched.map((u) => esc(u.label)).join(' · ')}</p>
      <p class="panel-note dim">Shown separately on purpose: never having been asked is not the same as getting it wrong.</p>`;
    cols.appendChild(c);
  }
  deck.appendChild(cols);
  pane.appendChild(deck);

  if (!answered) {
    const row = el('div', 'row');
    const go = el('button', 'btn', 'Take a practice test');
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

  crumb(pane, 'Insights');
  const head = el('div', 'ins-head');
  head.innerHTML = `<div><h2>Site insights</h2>
      <p class="sub">Where visitors come from, and how many got as far as an account, a checkout and a payment.</p></div>`;
  const ranges = el('div', 'ins-ranges');
  [7, 28, 90].forEach((d) => {
    const b = el('button', 'ins-range', `${d} days`);
    b.setAttribute('aria-pressed', String(d === insightsRange));
    b.onclick = () => { insightsRange = d; render(); };
    ranges.appendChild(b);
  });
  head.appendChild(ranges);
  pane.appendChild(head);

  const body = el('div', 'ins-body');
  body.innerHTML = '<p class="sub">Loading…</p>';
  pane.appendChild(body);

  api(`/api/analytics?days=${insightsRange}`)
    .then((d) => drawInsights(body, d))
    .catch((err) => {
      body.innerHTML = '';
      const c = el('div', 'panel');
      c.innerHTML = `<p class="label">Not available</p>
        <p class="panel-note">${esc(err.message)}</p>
        <p class="panel-note dim">If this says the tables are missing, the migration has not been applied to the live database yet.</p>`;
      body.appendChild(c);
    });
}

function drawInsights(body, d) {
  body.innerHTML = '';
  const t = d.totals || {};

  const strip = el('div', 'strip');
  strip.innerHTML = [
    [t.views ?? 0, 'Page views'],
    [t.accounts ?? 0, 'Accounts created'],
    [t.checkouts ?? 0, 'Checkouts opened'],
    [t.payments ?? 0, 'Payments completed'],
    [t.refunds ?? 0, 'Refunds'],
  ].map(([v, l]) => `<div class="cell"><b class="mono">${v}</b><span class="label">${l}</span></div>`).join('');
  body.appendChild(strip);

  const cols = el('div', 'deck-cols');
  const series = d.series || [];
  if (series.length) {
    const peak = Math.max(...series.map((r) => r.views)) || 1;
    const c = el('div', 'panel');
    c.innerHTML = `<p class="label">Page views per day · ${d.days}</p>
      <div class="spark">${series.map((r) => {
        const h = r.views ? Math.max(10, Math.round((r.views / peak) * 100)) : 4;
        return `<i style="height:${h}%" class="${r.views ? 'on' : ''}" title="${esc(`${r.views} view${r.views === 1 ? '' : 's'} on ${r.day}`)}"></i>`;
      }).join('')}</div>
      <p class="panel-note dim">${esc(d.from)} to ${esc(d.to)} · peak ${peak} in a day</p>`;
    cols.appendChild(c);
  }

  const steps = [
    ['Page views', t.views ?? 0],
    ['Accounts created', t.accounts ?? 0],
    ['Checkouts opened', t.checkouts ?? 0],
    ['Payments completed', t.payments ?? 0],
  ];
  const top = Math.max(...steps.map(([, v]) => v)) || 1;
  const funnel = el('div', 'panel');
  funnel.innerHTML = `<p class="label">How far people got</p>
    <div class="fun">${steps.map(([l, v]) => `
      <div class="fun-row">
        <div class="fun-top"><span>${l}</span><b class="mono">${v}</b></div>
        <div class="fun-bar"><i style="width:${Math.round((v / top) * 100)}%"></i></div>
      </div>`).join('')}</div>
    <p class="panel-note dim">Four separate counts, not one journey. Nothing here identifies a
      visitor, so we cannot tell which view became an account.</p>`;
  cols.appendChild(funnel);

  const countries = (d.countries || []).slice(0, 12);
  const cc = el('div', 'panel');
  if (countries.length) {
    cc.innerHTML = `<p class="label">Where visitors are</p>
      <div class="ins-table">${countries.map((c) => `
        <div class="ins-row">
          <span class="ins-k">${esc(countryName(c.code))}</span>
          <span class="ins-bar"><i style="width:${Math.round((c.views / (countries[0].views || 1)) * 100)}%"></i></span>
          <b class="mono">${c.views}</b>
        </div>`).join('')}</div>`;
  } else {
    cc.innerHTML = `<p class="label">Where visitors are</p><p class="panel-note">No views recorded in this range yet.</p>`;
  }
  cols.appendChild(cc);

  const pages = (d.pages || []).slice(0, 12);
  const pc = el('div', 'panel');
  if (pages.length) {
    pc.innerHTML = `<p class="label">Most-viewed pages</p>
      <div class="ins-table">${pages.map((r) => `
        <div class="ins-row">
          <span class="ins-k mono">${esc(r.path)}</span>
          <span class="ins-bar"><i style="width:${Math.round((r.views / (pages[0].views || 1)) * 100)}%"></i></span>
          <b class="mono">${r.views}</b>
        </div>`).join('')}</div>`;
  } else {
    pc.innerHTML = `<p class="label">Most-viewed pages</p><p class="panel-note">Nothing recorded in this range yet.</p>`;
  }
  cols.appendChild(pc);

  const byC = countries.filter((c) => c.accounts || c.checkouts);
  const ac = el('div', 'panel');
  if (byC.length) {
    ac.innerHTML = `<p class="label">Accounts and checkouts by country</p>
      <div class="ins-table">${byC.map((c) => `
        <div class="ins-row three">
          <span class="ins-k">${esc(countryName(c.code))}</span>
          <b class="mono">${c.accounts}</b><b class="mono dim">${c.checkouts}</b>
        </div>`).join('')}</div>
      <p class="panel-note dim">Accounts, then checkouts opened.</p>`;
  } else {
    ac.innerHTML = `<p class="label">Accounts and checkouts by country</p>
      <p class="panel-note">No accounts or checkouts recorded in this range yet.</p>`;
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
  box.innerHTML = `<p class="label">Your own visits</p>`;
  const row = el('div', 'opt-row');
  const btn = el('button', 'opt-toggle');
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(on));
  btn.innerHTML = `<span class="opt-track"><span class="opt-knob"></span></span>
    <span class="opt-text">Don't count my visits</span>`;
  const note = el('p', 'panel-note dim');
  const say = (v) => {
    note.textContent = v
      ? 'Your visits in this browser are not counted, and Google Analytics is switched off here too. Other browsers and devices are still counted separately.'
      : 'Your own visits are being counted, which will flatter the numbers while traffic is low.';
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
  msg.textContent = `The checkout could not open (${detail}). Nothing has been charged. Please try again, or contact support and we will sort it out.`;
}

function paywall(pane, what) {
  const box = el('div', 'card locked');
  box.innerHTML = `<div class="disc">🔓</div>
    <h3>${esc(what)} is part of full access</h3>
    <p>Everything you're studying stays free. Full access adds unlimited practice tests and interview practice.</p>
    <p class="price">${PRICE}</p>
    <p class="label">One time · no subscription</p>
    <p class="pay-note" style="margin-top:6px">Plus any tax your country charges. Paddle shows you the total before you pay.</p>`;

  const row = el('div', 'row');
  row.style.justifyContent = 'center';
  const buy = el('button', 'btn', `Unlock for ${PRICE}`);
  const msg = el('p', 'pay-msg');
  msg.hidden = true;

  const paddleCfg = state.config && state.config.paddle;
  if (!paddleCfg || !paddleCfg.configured || paddleCfg.salesPaused) {
    // Honest about it rather than a button that opens a checkout and fails. Two reasons
    // land here: the keys are not set yet, or they are set but Paddle has not finished
    // approving the account, which it refuses checkouts for.
    buy.disabled = true;
    buy.textContent = 'Not on sale yet';
    msg.hidden = false;
    msg.textContent = paddleCfg && paddleCfg.salesPaused
      ? 'Full access goes on sale shortly — our payment provider is still finishing our account checks. Everything free is available now, and there is nothing to pay to keep studying.'
      : 'Full access is not on sale on the website yet. Everything free is available now.';
  }

  buy.onclick = async () => {
    msg.hidden = true;
    msg.className = 'pay-msg';
    buy.disabled = true;
    buy.textContent = 'Opening checkout…';
    try {
      // The server hands over the price and stamps the account id on the transaction, so
      // the webhook knows whose access to unlock.
      const checkout = await api('/api/checkout', { method: 'POST' });
      if (!initPaddle(checkout)) throw new Error('The payment window could not load. Check your connection and try again.');

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
      buy.textContent = `Unlock for ${PRICE}`;
      buy.disabled = false;
    } catch (err) {
      msg.hidden = false;
      msg.className = 'pay-msg bad';
      msg.textContent = err.message;
      buy.textContent = `Unlock for ${PRICE}`;
      buy.disabled = false;
    }
  };

  row.appendChild(buy);
  box.appendChild(row);
  box.appendChild(msg);
  box.appendChild(el('p', 'pay-note',
    'Payment is handled by Paddle, our reseller. Your card details never reach us. '
    + 'One-time payment, no subscription — see <a href="/refunds">refunds</a> and '
    + '<a href="/terms">terms</a>.'));
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
  pane.appendChild(el('h2', null, 'Thank you — confirming your payment'));
  const note = el('p', 'sub', 'This usually takes a couple of seconds.');
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
      note.textContent = 'Your bank is still processing the payment. Waiting…';
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  note.textContent =
    'Your payment went through, but the confirmation has not reached us yet. It normally arrives within a minute or two. Check again below — and if full access is still missing, send us the receipt Paddle emailed you and we will put it right straight away.';
  const row = el('div', 'row');
  const again = el('button', 'btn', 'Check again');
  again.onclick = () => confirmPurchase(transactionId);
  const help = el('a', 'btn ghost', 'Contact support');
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
    $('#pane').innerHTML = `<h2>Something went wrong loading your account</h2>
      <p class="sub">${esc(err.message)}</p>
      <p class="sub"><a href="/app">Try again</a> · <a href="/support">Contact support</a></p>`;
  });
