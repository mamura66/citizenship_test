// One write: the promotional text, which Apple lets you edit without a new version.
// The live copy says "practise"; the audience is American. Everything else on the store is
// left exactly as it is - the description is version-locked and goes with 1.0.1.
const { get, patch, APP_ID } = require('./asc');
const WANT = 'Every official USCIS civics question, free forever. Track your readiness, study by topic, and practice the real interview. One-time unlock, no subscription.';
(async () => {
  const vs = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=1`);
  const v = vs.json.data[0];
  const loc = await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
  const l = loc.json.data.find((x) => x.attributes.locale === 'en-US');
  console.log('before:', JSON.stringify(l.attributes.promotionalText));
  if (l.attributes.promotionalText === WANT) { console.log('already correct, nothing written'); return; }
  const r = await patch(`/v1/appStoreVersionLocalizations/${l.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: l.id, attributes: { promotionalText: WANT } },
  });
  console.log('patch status:', r.status, r.ok ? '' : r.text.slice(0, 300));
  const after = await get(`/v1/appStoreVersionLocalizations/${l.id}`);
  console.log('after: ', JSON.stringify(after.json.data.attributes.promotionalText));
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
