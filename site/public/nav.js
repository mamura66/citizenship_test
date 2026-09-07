/* Makes the marketing pages reflect whether you are signed in.
 *
 * These pages are static files on the CDN, identical for everyone, so the nav said
 * "Sign in" even to somebody who had just come from their own account - which reads as
 * having been logged out. The session is a cookie, so the page can simply ask.
 *
 * Progressive by design: with JavaScript off, or if the call fails, the page keeps the
 * "Sign in" it was built with, which is still correct - it just makes one more click.
 */
(async () => {
  let user = null;
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) user = (await res.json()).user;
  } catch {
    return;
  }
  if (!user) return;

  // Nav: "Sign in" becomes the way back into the app.
  document.querySelectorAll('a[href="/login"]').forEach((a) => {
    a.href = '/app';
    a.textContent = 'Open the app';
  });

  // Any "create an account" call to action is pointless once you have one.
  document.querySelectorAll('a[href="/signup"]').forEach((a) => {
    a.href = '/app';
    a.textContent = user.pro ? 'Open the app' : 'Continue studying';
  });

  // Say who, so it is obvious which account you are in - the thing whose absence made
  // this look broken in the first place.
  const links = document.querySelector('.nav-links');
  if (links) {
    const who = document.createElement('span');
    who.className = 'nav-who';
    who.textContent = user.name || user.email;
    who.title = user.email;
    links.insertBefore(who, links.firstChild);
  }
})();
