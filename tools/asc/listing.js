// Read-only dump of what the App Store actually shows: version state, localized text,
// keywords, screenshot sets, and ratings. Nothing here writes.
const { get, APP_ID } = require('./asc');
(async () => {
  const info = await get(`/v1/apps/${APP_ID}/appInfos?limit=2`);
  for (const ai of info.json.data || []) {
    const loc = await get(`/v1/appInfos/${ai.id}/appInfoLocalizations`);
    for (const l of loc.json.data || []) {
      console.log(`[appInfo ${ai.attributes.appStoreState}] ${l.attributes.locale}`);
      console.log('  name     :', JSON.stringify(l.attributes.name));
      console.log('  subtitle :', JSON.stringify(l.attributes.subtitle));
    }
    const cats = await get(`/v1/appInfos/${ai.id}?include=primaryCategory,secondaryCategory`);
    const inc = (cats.json.included || []).map((c) => c.id);
    console.log('  categories:', inc.join(', ') || '(none returned)');
  }
  const vs = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=3`);
  for (const v of vs.json.data || []) {
    const a = v.attributes;
    console.log(`\n[version ${a.versionString}] state=${a.appVersionState || a.appStoreState} created=${a.createdDate}`);
    const loc = await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
    for (const l of loc.json.data || []) {
      const t = l.attributes;
      console.log(`  locale ${t.locale}`);
      console.log('    keywords   :', JSON.stringify(t.keywords), `(${(t.keywords || '').length} chars)`);
      console.log('    promoText  :', JSON.stringify(t.promotionalText));
      console.log('    whatsNew   :', JSON.stringify(t.whatsNew));
      console.log('    supportUrl :', t.supportUrl, '| marketingUrl:', t.marketingUrl);
      const d = t.description || '';
      console.log(`    description: ${d.length} chars; contains "PRACTISE": ${/PRACTISE/.test(d)}; first line: ${JSON.stringify(d.split('\n')[0])}`);
      const shots = await get(`/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets?include=appScreenshots`);
      for (const s of shots.json.data || []) {
        const n = (s.relationships?.appScreenshots?.data || []).length;
        console.log(`    screenshots ${s.attributes.screenshotDisplayType}: ${n}`);
      }
    }
  }
  const r = await get(`/v1/apps/${APP_ID}/customerReviews?limit=5&sort=-createdDate`);
  console.log(`\n[reviews] status ${r.status}, returned ${(r.json && r.json.data || []).length}`);
  for (const x of (r.json && r.json.data) || []) console.log(`  ${x.attributes.rating}★ ${JSON.stringify(x.attributes.title)} ${x.attributes.createdDate}`);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
