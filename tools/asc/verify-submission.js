const { get, APP_ID } = require('./asc');
const tick = (b) => (b ? '[x]' : '[ ]');
(async () => {
  const v = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=1`);
  const ver = v.json.data[0];
  console.log('VERSION', ver.attributes.versionString, '->', ver.attributes.appVersionState || ver.attributes.appStoreState);

  const rs = await get(`/v1/apps/${APP_ID}/reviewSubmissions?limit=3`);
  for (const s of (rs.json && rs.json.data) || []) {
    console.log('  submission', s.id.slice(0, 8), '| state', s.attributes.state, '| submitted', s.attributes.submittedDate || '-');
  }

  const b = await get(`/v1/appStoreVersions/${ver.id}/build`);
  let buildNum = '-';
  if (b.json && b.json.data) {
    const bd = await get(`/v1/builds/${b.json.data.id}`);
    buildNum = bd.json.data.attributes.version;
  }
  const vl = await get(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations`);
  const en = vl.json.data.find((l) => l.attributes.locale === 'en-US');
  const a = en.attributes;
  const ss = await get(`/v1/appStoreVersionLocalizations/${en.id}/appScreenshotSets`);
  let shots = 0;
  for (const s of ss.json.data || []) {
    const q = await get(`/v1/appScreenshotSets/${s.id}/appScreenshots`);
    shots += (q.json.data || []).length;
  }
  const info = await get(`/v1/apps/${APP_ID}/appInfos`);
  const ai = info.json.data[0];
  const ail = await get(`/v1/appInfos/${ai.id}/appInfoLocalizations`);
  const eni = ail.json.data.find((l) => l.attributes.locale === 'en-US').attributes;
  const rd = await get(`/v1/appStoreVersions/${ver.id}/appStoreReviewDetail`);
  const notes = rd.json && rd.json.data ? (rd.json.data.attributes.notes || '') : '';
  const price = await get(`/v1/appPriceSchedules/${APP_ID}/manualPrices?limit=1`);
  const p = await get(`/v1/apps/${APP_ID}/inAppPurchasesV2?limit=5`);

  console.log('\nWHAT APPLE HAS');
  console.log(' ', tick(!!buildNum), 'build', buildNum);
  console.log(' ', tick(shots === 5), `screenshots ${shots}`);
  console.log(' ', tick(!!eni.subtitle), 'subtitle', JSON.stringify(eni.subtitle));
  console.log(' ', tick(!!eni.privacyPolicyUrl), 'privacy URL');
  console.log(' ', tick(!!a.supportUrl), 'support URL');
  console.log(' ', tick(a.keywords && a.keywords.length > 0), `keywords ${a.keywords ? a.keywords.length : 0} chars`);
  console.log(' ', tick(a.description && a.description.length > 0), `description ${a.description ? a.description.length : 0} chars`);
  console.log(' ', tick(notes.length > 500), `review notes ${notes.length} chars`);
  console.log(' ', tick(((price.json && price.json.data) || []).length > 0), 'pricing');
  console.log('\nIN-APP PURCHASES');
  for (const x of p.json.data || []) {
    const flag = x.attributes.productId === 'lifetime_unlock' && x.attributes.state !== 'READY_TO_SUBMIT' ? '  <-- CHECK: retired consumable should NOT be in review' : '';
    console.log('  ', x.attributes.productId.padEnd(17), x.attributes.inAppPurchaseType.padEnd(15), x.attributes.state, flag);
  }
})();
