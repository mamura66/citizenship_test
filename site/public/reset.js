/* Both halves of the forgotten-password flow: /forgot asks for a link, /reset uses one.
   One file, because they share the page furniture and never both appear at once. */

const $ = (s) => document.querySelector(s);
const form = $('#form');
const msgBox = $('#msg');
const submit = form.querySelector('button[type=submit]');
const isResetPage = !!$('#expired');

function say(text) {
  msgBox.textContent = text;
  msgBox.hidden = !text;
}

const token = new URLSearchParams(location.search).get('token') || '';

/* ---------------------------------------------------------------- /reset */

if (isResetPage) {
  // Check the link before showing the form. Letting someone choose and confirm a password
  // only to be told the link died an hour ago is a small cruelty that costs one request
  // to avoid.
  fetch(`/api/auth/reset-token?token=${encodeURIComponent(token)}`)
    .then((r) => r.json())
    .then(({ valid }) => {
      if (valid) {
        $('#lede').textContent = 'Pick something you have not used anywhere else.';
        form.hidden = false;
        form.querySelector('input').focus();
      } else {
        $('#lede').hidden = true;
        $('#expired').hidden = false;
      }
    })
    .catch(() => {
      $('#lede').textContent = 'We could not check that link. Reload the page to try again.';
    });
}

/* ---------------------------------------------------------------- submit */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  say('');
  const data = Object.fromEntries(new FormData(form).entries());

  if (isResetPage) {
    if ((data.password || '').length < 10) return say('Use at least 10 characters.');
    if (data.password !== data.confirm) return say('Those two passwords are not the same.');
  } else if (!data.email) {
    return say('Enter your email address.');
  }

  submit.disabled = true;
  const label = submit.textContent;
  submit.textContent = isResetPage ? 'Saving…' : 'Sending…';

  try {
    const res = await fetch(isResetPage ? '/api/auth/reset' : '/api/auth/forgot', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(isResetPage ? { token, password: data.password } : { email: data.email }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'That did not work. Try again.');

    if (isResetPage) {
      // The reset already signed them in, so go straight to the app rather than making
      // them type the password they just chose.
      location.replace('/app');
      return;
    }
    form.hidden = true;
    $('#backLink').hidden = true;
    $('#done').hidden = false;
    return;
  } catch (err) {
    say(err.message);
  }
  submit.disabled = false;
  submit.textContent = label;
});
