/* The server's allowlist of country codes.
 *
 * Deliberately not the same list as COUNTRIES in public/app.js: the browser needs names,
 * flags and test titles to draw the picker, the server needs only to know which codes may
 * be written to an account. Adding a country means adding the content pack, the row in
 * app.js, and the code here. */
export const READY_COUNTRIES = ['us'];
export const isReadyCountry = (code) => READY_COUNTRIES.includes(String(code || '').toLowerCase());
