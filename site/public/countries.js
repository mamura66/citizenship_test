/* The country list, shared by the sign-up page and the app.
 *
 * One list in one file, because it is used in two places for two reasons: the sign-up form
 * needs it to build the dropdown where a person locks their country in, and the app needs
 * it to know which content pack to load and what to call it on screen.
 *
 * Adding a country is three edits and no new screens: the content pack under
 * /content/<code>/, a row here, and the code in the server's allowlist
 * (site/src/lib/countries.js) so an account may actually be created against it.
 */

const COUNTRIES = [
  {
    code: 'us',
    name: 'United States',
    test: 'USCIS civics test',
    ready: true,
    // Two live versions; the pack decides which files exist.
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
  { code: 'ca', name: 'Canada', test: 'Discover Canada test', ready: false, flag: `<svg viewBox="0 0 19 10" style="width:100%;height:100%;display:block"><rect width="19" height="10" fill="#fff"/><rect width="4.75" height="10" fill="#D80621"/><rect x="14.25" width="4.75" height="10" fill="#D80621"/></svg>` },
  { code: 'uk', name: 'United Kingdom', test: 'Life in the UK test', ready: false, flag: `<svg viewBox="0 0 19 10" style="width:100%;height:100%;display:block"><rect width="19" height="10" fill="#012169"/><path d="M0 0l19 10M19 0L0 10" stroke="#fff" stroke-width="2"/><path d="M9.5 0v10M0 5h19" stroke="#fff" stroke-width="3"/><path d="M9.5 0v10M0 5h19" stroke="#C8102E" stroke-width="1.8"/></svg>` },
  { code: 'au', name: 'Australia', test: 'Australian citizenship test', ready: false, flag: `<svg viewBox="0 0 19 10" style="width:100%;height:100%;display:block"><rect width="19" height="10" fill="#00008B"/><rect width="9.5" height="5" fill="#012169"/><path d="M0 0l9.5 5M9.5 0L0 5" stroke="#fff" stroke-width="1"/></svg>` },
];

const READY_COUNTRIES = COUNTRIES.filter((c) => c.ready);
