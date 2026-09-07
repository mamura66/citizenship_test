/* Sign in and create account - one script for both pages.
 *
 * Everything it does is a form post to the Worker. The session comes back as an
 * HttpOnly cookie, so this file never sees a token and could not leak one.
 */

const $ = (s) => document.querySelector(s);
const form = $('#form');
const msgBox = $('#msg');
const submit = form.querySelector('button[type=submit]');
const isSignup = !!$('#country');

function say(text) {
  msgBox.textContent = text;
  msgBox.hidden = !text;
  if (text) msgBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* A failed Google round trip comes back as /login?error=..., so show it here rather than
   leaving someone on a page that looks like nothing happened. */
const params = new URLSearchParams(location.search);
if (params.get('error')) say(params.get('error'));

/* Where to go once signed in. Only same-site paths are honoured - an open redirect on a
   sign-in page is how phishing pages get to borrow a real domain. */
const nextPath = (() => {
  const raw = params.get('next') || '/app';
  return /^\/[A-Za-z0-9/_-]*$/.test(raw) ? raw : '/app';
})();

/* The Google button is drawn only when the server says the credentials are configured;
   otherwise it would be a button that returns 503. */
fetch('/api/config')
  .then((r) => r.json())
  .then((cfg) => {
    if (!cfg.google) return;
    $('#googleBlock').hidden = false;
    $('#google').href = `/api/auth/google/start?next=${encodeURIComponent(nextPath)}`;
  })
  .catch(() => {});

/* Countries come from the shared list, and only the live ones are selectable - offering a
   country we have no question pack for would be a promise we cannot keep. */
if (isSignup) {
  const sel = $('#country');
  READY_COUNTRIES.forEach((c) => {
    const o = document.createElement('option');
    o.value = c.code;
    o.textContent = `${c.name} — ${c.test}`;
    sel.appendChild(o);
  });
  if (READY_COUNTRIES.length === 1) sel.value = READY_COUNTRIES[0].code;

  const soon = COUNTRIES.filter((c) => !c.ready);
  if (soon.length) {
    const o = document.createElement('option');
    o.disabled = true;
    o.textContent = `${soon.map((c) => c.name).join(', ')} — coming`;
    sel.appendChild(o);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  say('');

  const data = Object.fromEntries(new FormData(form).entries());
  if (!data.email || !data.password) return say('Enter your email and password.');
  if (isSignup && !data.country) return say('Choose the country you are applying in.');
  if (isSignup && data.password.length < 10) return say('Use at least 10 characters for your password.');

  submit.disabled = true;
  const label = submit.textContent;
  submit.textContent = isSignup ? 'Creating your account…' : 'Signing in…';

  try {
    const res = await fetch(isSignup ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'That did not work. Try again.');
    // Replace rather than assign, so Back does not land on a sign-in page you are past.
    location.replace(nextPath);
    return;
  } catch (err) {
    say(err.message);
  }
  submit.disabled = false;
  submit.textContent = label;
});
