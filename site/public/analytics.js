/* Opting out of being counted, in this browser.
 *
 * Set from the Insights screen. It suppresses both our own visit counter and Google
 * Analytics, because somebody excluding themselves means from the figures, not from one of
 * two sets of them.
 *
 * This is the one thing this product writes to a visitor's browser for analytics, and only
 * because they asked it to - which is why the privacy policy names it. There is no
 * server-side record of the choice, so it is per-browser and per-device, exactly like the
 * localStorage flag PastClimate uses.
 */
const OPT_OUT_KEY = 'pfc.noanalytics';
function optedOut() {
  try { return localStorage.getItem(OPT_OUT_KEY) === '1'; } catch { return false; }
}

/* Analytics, decided by the server and — where the law requires it — by the visitor.
 *
 * Nothing loads unless /api/config says so, so switching analytics on or off is a
 * configuration change rather than an edit to every page.
 *
 * GA4 sets cookies. In the EEA, the UK and Switzerland that needs opt-in consent *before*
 * the cookie is set, so in those countries nothing loads until somebody chooses. Elsewhere
 * it loads immediately. Google Consent Mode is set to denied by default either way, so
 * even the moment before a choice is made, nothing is stored.
 *
 * A choice is remembered in localStorage, per browser. There is no server-side record of
 * it, because keeping one would mean holding a row about somebody who asked us not to
 * track them.
 */

/* ---------------------------------------------------------------- our own count
 *
 * One POST per page view to /api/pulse, carrying the path and nothing else. Deliberately
 * outside everything below it:
 *
 *   - It runs regardless of the Google Analytics consent choice, and regardless of
 *     whether GA is switched on at all. It is not a cookie and not personal data, so it
 *     is not what the banner is asking about - and gating it behind that choice would
 *     mean a site with no traffic figures at all in Europe.
 *   - It does not wait for /api/config. A page view that needed a round trip first would
 *     miss anybody who left quickly, and there is nothing to configure: it either counts
 *     or, if the Worker has no database bound, quietly does not.
 *
 * The server adds 1 to a row keyed on (date, page, country). No cookie is set, nothing is
 * written to localStorage or sessionStorage, and no identifier for you exists anywhere in
 * it - which is why there is nothing here to ask permission for or to opt out of. The
 * session cookie is sent same-origin, read only to skip the owner's own visits, so the request cannot
 * tell the server who is making it even by accident.
 */
(() => {
  try {
    if (optedOut()) return;
    // A driven browser is not a visitor. navigator.webdriver is set by Playwright,
    // Selenium and anything else automating a real browser, so our own test runs stop
    // inflating the figures without any test-only switch in production code.
    if (navigator.webdriver) return;
    fetch('/api/pulse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: location.pathname }),
      // Same-origin so the server can see whether this is the owner's own session and
      // skip counting it. Nothing about the session is stored by the counter; it is read
      // to decide *not* to record, which is the opposite of tracking.
      credentials: 'same-origin',
      cache: 'no-store',
      // Survives the page being closed mid-flight, which is the common case on a bounce.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // A page view is never worth an error in somebody's console.
  }
})();

const CHOICE_KEY = 'pfc.analyticsConsent';

const readChoice = () => {
  try { return localStorage.getItem(CHOICE_KEY); } catch { return null; }
};
const saveChoice = (v) => {
  try { localStorage.setItem(CHOICE_KEY, v); } catch {}
};

function loadCloudflare(token) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token });
  document.head.appendChild(s);
}

let gaStarted = false;
/** Loads GA4 with Consent Mode. `granted` says whether storage is allowed yet. */
function loadGa4(measurementId, granted) {
  if (gaStarted) {
    if (granted) window.gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  gaStarted = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };

  // Denied first, always. Consent Mode has to be set before the config call, or gtag has
  // already decided it may store something.
  window.gtag('consent', 'default', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(s);
}

/** The banner. Only ever built for a visitor who has to be asked. */
function askForConsent(onChoice) {
  const bar = document.createElement('div');
  bar.className = 'consent';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-live', 'polite');
  bar.setAttribute('aria-label', 'Cookies');
  bar.innerHTML = `
    <p>
      We'd like to use Google Analytics to see which pages people find useful. It sets a
      cookie. Studying works exactly the same either way, and we never sell anything about
      you. <a href="/privacy-web">What we collect</a>.
    </p>
    <div class="consent-btns">
      <button type="button" class="consent-no">No thanks</button>
      <button type="button" class="consent-yes">That's fine</button>
    </div>`;
  document.body.appendChild(bar);

  const close = (choice) => {
    saveChoice(choice);
    bar.remove();
    onChoice(choice);
  };
  bar.querySelector('.consent-yes').addEventListener('click', () => close('granted'));
  bar.querySelector('.consent-no').addEventListener('click', () => close('denied'));
  // Focus the decline button, not accept: the safe option should be the easy one.
  bar.querySelector('.consent-no').focus();
}

(async () => {
  let cfg;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    cfg = (await res.json()).analytics;
  } catch {
    return;
  }
  if (!cfg || cfg.mode === 'off') return;
  if (optedOut() || navigator.webdriver) return;

  if (cfg.mode === 'cloudflare') {
    // No cookies, no personal data, so nothing to ask about.
    if (cfg.token) loadCloudflare(cfg.token);
    return;
  }

  if (cfg.mode !== 'ga4' || !cfg.measurementId) return;

  if (!cfg.consentRequired) {
    loadGa4(cfg.measurementId, true);
    return;
  }

  const choice = readChoice();
  if (choice === 'granted') { loadGa4(cfg.measurementId, true); return; }
  if (choice === 'denied') return;

  // Nothing from Google is loaded until there is an answer.
  //
  // Consent Mode would allow loading gtag in a denied state, and no cookie would be set.
  // But loading the script still hands Google the visitor's IP address, and some
  // regulators treat that as processing that needed consent first. The only thing this
  // stricter choice costs is a cookieless page view we were never going to act on.
  askForConsent((c) => { if (c === 'granted') loadGa4(cfg.measurementId, true); });
})();
