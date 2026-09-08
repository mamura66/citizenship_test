/* The country strip on the home page, told the truth by the content packs.
 *
 * The marketing pages are static files on the CDN, so the HTML has to carry *some* answer
 * to "which countries are ready". What it carries is the conservative one: a country is
 * written as coming until something proves otherwise. This script is that proof - it asks
 * countriesReady(), which reads the same pack manifest the sign-up page and the app read,
 * and upgrades a chip only when the questions are actually there.
 *
 * Which means the page cannot promise a country we cannot serve, and cannot go stale in
 * the other direction either: the day a pack lands, the home page says so without anybody
 * editing it, and the day a pack is withdrawn over a licence question it stops saying so.
 *
 * With JavaScript off, the page reads as it was written - true, just cautious.
 */
(async () => {
  const strip = document.querySelector('.ctry-strip');
  const line = document.getElementById('countryLine');
  if (!strip || typeof countriesReady !== 'function') return;

  let ready;
  try {
    ready = await countriesReady();
  } catch {
    // Leave the cautious HTML exactly as it is. A failed probe is not a reason to start
    // making claims, and it is certainly not a reason to unclaim the United States.
    return;
  }
  if (!Array.isArray(ready) || !ready.length) return;

  const chips = [...strip.querySelectorAll('[data-country]')];
  const rowOf = (code) => COUNTRIES.find((c) => c.code === code);

  chips.forEach((chip) => {
    const row = rowOf(chip.dataset.country);
    const label = chip.querySelector('[data-chip-state]');
    if (!row || !label) return;
    const isReady = !!row.ready;
    chip.classList.toggle('is-live', isReady);
    // <b> for a live country and <span> for one still coming: that is what the stylesheet
    // keys off, so the element is replaced rather than just re-labelled.
    const next = document.createElement(isReady ? 'b' : 'span');
    next.setAttribute('data-chip-state', '');
    next.textContent = isReady ? 'Ready now' : 'Coming next';
    label.replaceWith(next);
  });

  if (!line) return;
  const named = chips.map((chip) => rowOf(chip.dataset.country)).filter(Boolean);
  const live = named.filter((c) => c.ready);
  const soon = named.filter((c) => !c.ready);
  if (!live.length) return;

  const name = (c) => c.prose || c.name;
  const list = (cs) => (typeof countryList === 'function'
    ? countryList(cs.map(name))
    : cs.map(name).join(' and '));

  // Capitalised because it starts the sentence, and the prose form of a country name is
  // lower case ("the United States") precisely so it can sit inside one.
  const upper = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // One country takes a singular verb, including this one: "the United States is" is
  // correct US English, and this is the US English page.
  const isAre = live.length === 1 ? 'is' : 'are';

  // "a different set of official questions" was true while the only tests here published
  // their pools. It is not true of Canada or Australia, whose governments publish a study
  // guide and never the questions - those sets are ours, written from the official guide.
  // Saying "official" on the home page and "these are not the official questions" on the
  // study screen would be the site contradicting itself, so the promise is the thing that
  // is actually common to all of them: one app, one account.
  const head = `<strong>${upper(list(live))} ${isAre} ready today.</strong>`;
  const tail = soon.length
    ? ` ${upper(list(soon))} ${soon.length === 1 ? 'is' : 'are'} next — the same app with a different set of questions, not a different website to learn.`
    : ' Each one is a different set of questions in the same app, not a different website to learn.';
  line.innerHTML = head + tail;
})();
