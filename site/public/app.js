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
    const cur = byCat.get(r.c) || { seen: 0, ok: 0 };
    cur.seen += 1;
    if (r.ok) cur.ok += 1;
    byCat.set(r.c, cur);
  });
  return (state.pack.categories || []).map((cat) => {
    const d = byCat.get(cat.id);
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

/* ------------------------------------------------------------------ boot */
async function loadPack(country, versionId) {
  const version = (country.versions || []).find((v) => v.id === versionId) || country.versions[0];
  const res = await fetch(`/content/${country.code}/${version.file}`);
  if (!res.ok) throw new Error(`content pack missing for ${country.code}`);
  const pack = await res.json();
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
    b.onclick = () => { state.mode = b.dataset.mode; state.test = null; store.write({ mode: state.mode }); renderRail(); render(); };
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
function render() {
  const pane = $('#pane');
  pane.innerHTML = '';
  ({ study: renderStudy, practice: renderPractice, interview: renderInterview, performance: renderPerformance }[state.mode] || renderStudy)(pane);
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
  const card = el('div', 'card');
  if (!state.revealed) {
    card.innerHTML = `<span class="label">Question ${q.id}</span>
      <p class="q">${esc(q.question)}</p>
      <p class="label" style="margin-top:18px">Click to reveal</p>`;
  } else {
    const many = answers.length > 1;
    card.innerHTML = `<span class="label">${many ? `Accepted answers · ${answers.length}` : 'Answer'}</span>
      ${acceptsAnyOne(q.question, answers.length) ? '<p style="color:var(--accent);font-size:13.5px;margin:6px 0 0">Any one of these is accepted.</p>' : ''}
      <ul class="answers">${answers.map((a) => `<li><span class="tick">✓</span><span>${esc(a)}</span></li>`).join('')}</ul>
      ${q.note ? `<p class="note">${esc(q.note)}</p>` : ''}
      <p class="label" style="margin-top:16px">Click to go back</p>`;
  }
  wrap.appendChild(card);
  wrap.onclick = () => { state.revealed = !state.revealed; render(); };
  pane.appendChild(wrap);

  const row = el('div', 'row');
  const prev = el('button', 'btn ghost', 'Previous');
  prev.onclick = () => { state.cardIndex = (i - 1 + pool.length) % pool.length; state.revealed = false; render(); };
  const next = el('button', 'btn', 'Next question');
  next.onclick = () => { state.cardIndex = (i + 1) % pool.length; state.revealed = false; render(); };
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

function renderPractice(pane) {
  const asked = state.pack.askedPerInterview || 10;
  const pass = state.pack.passRequirement || Math.ceil(asked * 0.6);

  if (!state.test) {
    crumb(pane, 'Practice test');
    pane.appendChild(el('h2', null, 'Practice test'));
    pane.appendChild(el('p', 'sub',
      `In the real interview you're asked up to ${asked} questions and need ${pass} correct to pass. This test uses the same format.`));

    if (usedFreeTest() && !isPro()) { paywall(pane, 'Unlimited practice tests'); return; }

    const card = el('div', 'card');
    card.innerHTML = `<span class="label">${esc(state.country.name)} · ${esc(state.versionId)} test</span>
      <p class="q">${asked} questions · ${pass} to pass</p>
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
  if (t.at >= t.items.length) return renderResults(pane, t);

  const item = t.items[t.at];
  crumb(pane, `Question ${t.at + 1} of ${t.items.length}`);
  pane.appendChild(el('div', 'progress', `<i style="width:${((t.at) / t.items.length) * 100}%"></i>`));

  const card = el('div', 'card');
  card.innerHTML = `<span class="label">${item.expected > 1 ? `Select ${item.expected} answers` : 'Select one answer'}</span>
    <p class="q">${esc(item.q.question)}</p>`;
  const opts = el('div', 'opts');
  item.options.forEach((o, idx) => {
    const b = el('button', 'opt', `<span class="k">${idx + 1}</span><span>${esc(o)}</span>`);
    if (item.graded !== null) {
      b.disabled = true;
      const right = item.correct.has(o);
      const picked = item.picked.includes(o);
      b.dataset.state = right ? 'right' : picked ? 'wrong' : 'dim';
    } else {
      b.onclick = () => {
        item.picked.push(o);
        if (item.picked.length >= item.expected) {
          item.graded = item.picked.every((p) => item.correct.has(p));
          if (item.graded) t.correct += 1;
          recordAnswer(item.q, item.graded);
        }
        render();
      };
    }
    opts.appendChild(b);
  });
  card.appendChild(opts);
  pane.appendChild(card);

  if (item.graded !== null) {
    const row = el('div', 'row');
    const next = el('button', 'btn', t.at + 1 >= t.items.length ? 'See results' : 'Next question');
    next.onclick = () => { t.at += 1; render(); };
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
        ${acceptsAnyOne(m.q.question, m.acceptable.length) ? '<p style="color:var(--accent);font-size:13px;margin:5px 0 0">Any one of these is accepted.</p>' : ''}
        <ul class="answers">${m.acceptable.map((a) => `<li><span class="tick">✓</span><span>${esc(a)}</span></li>`).join('')}</ul>
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
    list.innerHTML = (q.answers || []).map((a) => `<li><span class="tick">✓</span><span>${esc(a)}</span></li>`).join('');
    card.appendChild(list);
  };
  const next = el('button', 'btn quiet', 'Another question');
  next.onclick = render;
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
 * map is drawn grey rather than hidden, so a new person can see the shape of what they are
 * about to fill in instead of an empty page that reads as a missing feature.
 */

/** The most recent outcome per question, which is what the map colors by - getting a
 *  question right after getting it wrong should show as learned, not as a black mark. */
function latestByQuestion() {
  const out = new Map();
  (store.read().answers || []).forEach((r) => {
    const prev = out.get(r.q);
    if (!prev || r.at >= prev.at) out.set(r.q, r);
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

/** An accuracy dial with the pass line marked on it. One scale, and the only number on it
 *  is one the data actually reaches. */
function accuracyDial(pct, passPct) {
  const R = 54, C = 64, STROKE = 11;
  const circ = 2 * Math.PI * R;
  const shown = pct === null ? 0 : pct;
  const color = pct === null ? 'var(--line)' : pct >= passPct ? 'var(--good)' : 'var(--bad)';
  // The pass mark, as a tick on the same scale the arc is drawn on.
  const passAngle = (passPct / 100) * 2 * Math.PI - Math.PI / 2;
  const tick = [
    C + Math.cos(passAngle) * (R - STROKE / 2 - 3),
    C + Math.sin(passAngle) * (R - STROKE / 2 - 3),
    C + Math.cos(passAngle) * (R + STROKE / 2 + 3),
    C + Math.sin(passAngle) * (R + STROKE / 2 + 3),
  ];
  return `<svg viewBox="0 0 ${C * 2} ${C * 2}" class="dial" role="img"
       aria-label="${pct === null ? 'No answers recorded yet' : `Accuracy ${pct} percent, pass line ${passPct} percent`}">
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--line)" stroke-width="${STROKE}"/>
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${color}" stroke-width="${STROKE}"
            stroke-linecap="round" transform="rotate(-90 ${C} ${C})"
            stroke-dasharray="${(circ * shown / 100).toFixed(1)} ${circ.toFixed(1)}"/>
    <line x1="${tick[0].toFixed(1)}" y1="${tick[1].toFixed(1)}" x2="${tick[2].toFixed(1)}" y2="${tick[3].toFixed(1)}"
          stroke="var(--ink)" stroke-width="2"/>
    <text x="${C}" y="${C + 2}" text-anchor="middle" dominant-baseline="middle"
          font-family="IBM Plex Mono, monospace" font-size="26" font-weight="600" fill="var(--ink)">${pct === null ? '—' : pct + '%'}</text>
    <text x="${C}" y="${C + 24}" text-anchor="middle" font-family="IBM Plex Mono, monospace"
          font-size="9" letter-spacing="0.1em" fill="var(--ink-3)">ACCURACY</text>
  </svg>`;
}

function renderPerformance(pane) {
  const hist = store.read().history || [];
  const log = store.read().answers || [];
  const recent = hist.slice(-7);
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

  crumb(pane, 'Performance');
  pane.appendChild(el('h2', null, 'Where you stand'));
  pane.appendChild(el('p', 'sub', answered
    ? (overall >= passPct
        ? `You are answering above the ${passPct}% pass line. The map below shows what is left.`
        : `You are below the ${passPct}% pass line. The weakest sections are listed underneath.`)
    : 'Nothing here is estimated. Answer a question in a practice test and this fills in with your own results.'));

  /* ---- the dial and the numbers beside it ---- */
  const top = el('div', 'card perf-top');
  top.innerHTML = `
    <div class="perf-dial">${accuracyDial(overall, passPct)}
      <p class="perf-dial-note">Pass line ${passPct}%</p>
    </div>
    <div class="perf-figures">
      <div><b class="mono">${seenPct}%</b><span class="label">Of the pool seen</span></div>
      <div><b class="mono">${hist.length || '—'}</b><span class="label">Tests finished</span></div>
      <div><b class="mono">${streak || '—'}</b><span class="label">Day streak</span></div>
      <div><b class="mono">${answered || '—'}</b><span class="label">Answers recorded</span></div>
    </div>`;
  pane.appendChild(top);

  /* ---- the map: one cell per question, grouped by section ---- */
  const map = el('div', 'card');
  map.style.marginTop = '14px';
  const rows = (state.pack.categories || []).map((cat) => {
    const cells = cat.questions.map((q) => {
      const r = latest.get(q.id);
      const cls = !r ? 'u' : r.ok ? 'r' : 'w';
      const title = `${q.question}\n${!r ? 'Not asked yet' : r.ok ? 'Answered correctly' : 'Answered wrongly'}`;
      return `<i class="c ${cls}" title="${esc(title)}"></i>`;
    }).join('');
    return `<div class="map-row">
      <span class="map-name">${esc(subsection(cat.subsection))}</span>
      <span class="map-cells">${cells}</span>
    </div>`;
  }).join('');
  map.innerHTML = `<span class="label">Your map of the official test</span>
    <p class="perf-help">Every question you could be asked, grouped by section. It fills in as you answer.</p>
    <div class="map">${rows}</div>
    <p class="map-key">
      <span><i class="c r"></i> right</span>
      <span><i class="c w"></i> wrong</span>
      <span><i class="c u"></i> not asked yet</span>
    </p>`;
  pane.appendChild(map);

  /* ---- last 30 days ---- */
  const act = activity(30);
  if (act.some((d) => d.n)) {
    const peak = Math.max(...act.map((d) => d.n));
    const bars = act.map((d) => {
      const h = d.n ? Math.max(12, Math.round((d.n / peak) * 100)) : 3;
      const label = d.n
        ? `${d.n} answer${d.n === 1 ? '' : 's'} on ${d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
        : `Nothing on ${d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
      return `<i style="height:${h}%" class="${d.n ? 'on' : ''}" title="${esc(label)}"></i>`;
    }).join('');
    const card = el('div', 'card');
    card.style.marginTop = '14px';
    card.innerHTML = `<span class="label">Last 30 days</span>
      <p class="perf-help">Answers per day. Short, regular sessions beat one long one.</p>
      <div class="spark">${bars}</div>`;
    pane.appendChild(card);
  }

  /* ---- score trend: one scale, every label a value the data reaches ---- */
  if (recent.length >= 2) {
    const W = 640, H = 160, PAD = 28;
    const pts = recent.map((h, i) => [
      PAD + (i / (recent.length - 1)) * (W - PAD * 2),
      H - PAD - (h.pct / 100) * (H - PAD * 2),
    ]);
    const line = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - PAD} L${pts[0][0].toFixed(1)} ${H - PAD} Z`;
    const passY = H - PAD - (passPct / 100) * (H - PAD * 2);
    const last = pts[pts.length - 1];
    const card = el('div', 'card');
    card.style.marginTop = '14px';
    card.innerHTML = `<span class="label">Your last ${recent.length} test scores</span>
      <svg viewBox="0 0 ${W} ${H}" class="trend" role="img"
           aria-label="Your last ${recent.length} test scores, oldest on the left, most recent ${recent[recent.length - 1].pct} percent.">
        <line x1="${PAD}" x2="${W - PAD}" y1="${passY}" y2="${passY}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/>
        <text x="${PAD}" y="${passY - 6}" fill="var(--ink-3)" font-family="IBM Plex Mono, monospace" font-size="10">${passPct}% pass line</text>
        <path d="${area}" fill="var(--accent-soft)"/>
        <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
        ${pts.map((pt, i) => `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3}" fill="var(--accent)"/>`).join('')}
        <text x="${last[0].toFixed(1)}" y="${(last[1] - 12).toFixed(1)}" text-anchor="end" fill="var(--ink)"
              font-family="IBM Plex Mono, monospace" font-size="11">${recent[recent.length - 1].pct}%</text>
      </svg>`;
    pane.appendChild(card);
  }

  /* ---- sections, weakest first, each one a way in ---- */
  const acc = sectionAccuracy();
  const attempted = acc.filter((a) => a.pct !== null).sort((a, b) => a.pct - b.pct);
  const untouched = acc.filter((a) => a.pct === null);

  if (attempted.length) {
    const card = el('div', 'card');
    card.style.marginTop = '14px';
    card.innerHTML = `<span class="label">Accuracy by section · weakest first</span>`;
    const list = el('div', 'sec-list');
    attempted.forEach((a) => {
      const weak = a.pct < passPct;
      const row = el('div', 'sec');
      row.innerHTML = `
        <div class="sec-head">
          <span class="sec-name">${esc(a.label)}</span>
          <span class="mono sec-pct" style="color:${weak ? 'var(--bad)' : 'var(--good)'}">${a.pct}%</span>
        </div>
        <div class="sec-bar"><i style="width:${a.pct}%;background:${weak ? 'var(--bad)' : 'var(--accent)'}"></i></div>`;
      const go = el('button', 'sec-go', `Study ${a.label} →`);
      go.onclick = () => { state.mode = 'study'; state.topicId = a.id; state.cardIndex = 0; state.revealed = false; renderRail(); render(); };
      row.appendChild(go);
      list.appendChild(row);
    });
    card.appendChild(list);
    pane.appendChild(card);
  }

  if (untouched.length) {
    const card = el('div', 'card');
    card.style.marginTop = '14px';
    card.innerHTML = `<span class="label">Not tested yet · ${untouched.length} section${untouched.length === 1 ? '' : 's'}</span>
      <p style="color:var(--ink-2);margin:8px 0 0;font-size:14.5px">${untouched.map((u) => esc(u.label)).join(' · ')}</p>
      <p class="perf-help" style="margin-top:8px">Shown separately on purpose: never having been asked is not the same as getting it wrong.</p>`;
    pane.appendChild(card);
  }

  if (!answered) {
    const row = el('div', 'row');
    const go = el('button', 'btn', 'Take a practice test');
    go.onclick = () => { state.mode = 'practice'; state.test = null; store.write({ mode: 'practice' }); renderRail(); render(); };
    row.appendChild(go);
    pane.appendChild(row);
  }
}

/* ---------- paywall: real Paddle checkout ---------- */

/** Paddle.js is initialised once, lazily, with whatever the server says the environment
 *  is. Sandbox and live are separate Paddle accounts with separate tokens, so this is the
 *  only thing that has to change to go live - no code edit. */
let paddleReady = false;
function initPaddle(cfg) {
  if (paddleReady) return true;
  // Checks the fields it actually needs, not a `configured` flag. This is called with the
  // /api/checkout response, which has no such flag - /api/config does, and reading for it
  // here meant the overlay silently refused to open every time.
  if (!window.Paddle || !cfg || !cfg.token || !cfg.priceId) return false;
  if (cfg.environment === 'sandbox') Paddle.Environment.set('sandbox');
  Paddle.Initialize({
    token: cfg.token,
    eventCallback: (e) => {
      if (!e) return;
      // Every event, named, because the interesting failure was an event that never
      // arrived and there was no way to tell that from one that arrived unhandled.
      console.log(`Paddle event: ${e.name}`);
      if (e.name === 'checkout.completed') {
        // Paddle tells us the transaction id the moment the payment completes, which is
        // what lets the server confirm it directly instead of waiting on the webhook.
        const id = e.data && (e.data.transaction_id || e.data.id);
        if (id) confirmPurchase(id);
        return;
      }
      if (e.name === 'checkout.error' || e.name === 'checkout.warning') {
        // Paddle's own overlay shows a generic "something went wrong". Without this the
        // reason is thrown away, leaving both the customer and us with nothing to act on.
        const detail = (e.data && (e.data.message || e.data.error || JSON.stringify(e.data))) || 'no detail';
        console.error(`Paddle ${e.name}: ${detail}`);
        showCheckoutError(detail);
      }
    },
  });
  paddleReady = true;
  return true;
}

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
  if (!paddleCfg || !paddleCfg.configured) {
    // Honest about it rather than showing a button that does nothing. This is the state
    // before the Paddle keys are set.
    buy.disabled = true;
    buy.textContent = 'Checkout opening soon';
    msg.hidden = false;
    msg.textContent = 'Full access is not on sale on the website yet. Everything free is available now.';
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
