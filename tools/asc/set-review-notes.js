const { get, patch, APP_ID } = require('./asc');

// Apple asked for this information to live in the Notes field for future submissions,
// not only in the Resolution Center reply. Kept tight - the full text is in
// docs/store/review-reply.md.
const NOTES = `NO ACCOUNT REQUIRED. There is no registration, login, or credentials of any kind. Every feature is reachable immediately on launch. There is no user-generated content, so no reporting or blocking flows exist.

PURPOSE / AUDIENCE. A study aid for lawful permanent residents preparing for the naturalization civics test taken at the USCIS Form N-400 interview. It presents the official civics questions in a study format, runs practice tests in the real interview format and pass threshold, reads questions aloud so applicants hear them before interview day, and tracks readiness from their own completed tests.

IN-APP PURCHASE. One non-consumable, "Lifetime Access" (lifetime_access), $9.99, one time only. No subscription.
Free forever: all flashcards for every official question, study by topic, read-aloud, state-specific answers, and one complete practice test.
Unlocks: unlimited practice tests and the full mock interview.
TO REACH THE PURCHASE SCREEN: Practice tab -> complete one full practice test to the results screen (free) -> start a second test; the purchase screen appears. Also via Settings -> View lifetime unlock, or Interview tab -> Unlock Mock Interview. Restore Purchases is on the purchase screen and in Settings.

EXTERNAL SERVICES. Apple StoreKit for payment; RevenueCat for purchase management (receives only an anonymous per-install identifier and this app's purchase record - never a name, email, or anything typed into the app; anonymous app user IDs only, we never call its login API); Apple's on-device speech synthesis for reading questions aloud (no network, microphone never accessed, no audio recorded or transmitted). No backend server, no authentication service, no analytics or crash reporting, no advertising SDK, no AI service. All content is bundled in the binary.

REGIONS. Identical everywhere. English only, worldwide, nothing gated or altered by region. Same single purchase at the same price tier in all territories.

CONTENT RIGHTS. All civics questions, official answers, and reading/writing vocabulary are works of the United States Government published by USCIS, public domain under 17 U.S.C. 105, taken from uscis.gov (2025 civics test Form M-1778, and the 2008 100-question test). The four officeholder photographs are likewise public-domain U.S. Government works.

NOT AFFILIATED, NOT LEGAL ADVICE. This is an independent study aid. It is not affiliated with, endorsed by, or sponsored by USCIS, DHS, or any government agency, and uses no government seal, logo, or trademark. It gives no legal or immigration advice, prepares or submits no government form, and takes no part in any application. Stated in-app on the onboarding trust screen and in Settings -> About, and in the App Store description.`;

(async () => {
  const v = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=1`);
  const verId = v.json.data[0].id;
  const rd = await get(`/v1/appStoreVersions/${verId}/appStoreReviewDetail`);
  const id = rd.json.data.id;
  console.log('notes length:', NOTES.length, 'chars');
  const r = await patch(`/v1/appStoreReviewDetails/${id}`, {
    data: { type: 'appStoreReviewDetails', id, attributes: { notes: NOTES } },
  });
  console.log('PATCH notes: HTTP', r.status, r.ok ? 'updated' : r.text.slice(0, 300));
  const after = await get(`/v1/appStoreVersions/${verId}/appStoreReviewDetail`);
  const a = after.json.data.attributes;
  console.log('  stored:', (a.notes || '').length, 'chars');
  console.log('  contact:', a.contactFirstName, a.contactLastName, a.contactEmail, a.contactPhone);
  console.log('  demoAccountRequired:', a.demoAccountRequired);
})();
