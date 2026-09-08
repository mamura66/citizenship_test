// Apply the 1.0.1 text to the App Store version that `eas submit` creates. Run AFTER the
// build is submitted and the new version exists in App Store Connect.
//
//   ASC_KEY_PATH=... ASC_KEY_ID=... ASC_ISSUER_ID=... node tools/asc/set-version-metadata.js 1.0.1
//
// Writes only the version-locked fields that could not be changed on 1.0: the description
// (PRACTISE -> PRACTICE), the support URL (old workers.dev address -> the real domain), the
// marketing URL, and What's New. Reads listing.md so the store text has one source of truth.
const fs = require('fs');
const path = require('path');
const { get, patch, APP_ID } = require('./asc');

const want = process.argv[2];
if (!want) { console.error('usage: node set-version-metadata.js <versionString>'); process.exit(2); }

const md = fs.readFileSync(path.join(__dirname, '../../docs/store/listing.md'), 'utf8');
const block = (heading) => {
  const m = md.match(new RegExp(`## ${heading}[^\\n]*\\n\`\`\`\\n([\\s\\S]*?)\\n\`\`\``));
  if (!m) throw new Error(`listing.md has no block for "${heading}"`);
  return m[1].trim();
};
const description = block('Description');
const whatsNew = block("What's New \\(1\\.0\\.1\\)");
const supportUrl = block('Support URL');
const marketingUrl = block('Marketing URL');
if (/PRACTISE/.test(description)) throw new Error('listing.md description still says PRACTISE');

(async () => {
  const vs = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=5`);
  const v = (vs.json.data || []).find((x) => x.attributes.versionString === want);
  if (!v) { console.error(`no version ${want} yet - submit the build first. Have:`,
    (vs.json.data || []).map((x) => `${x.attributes.versionString} (${x.attributes.appVersionState || x.attributes.appStoreState})`).join(', ')); process.exit(1); }
  console.log(`version ${want}: ${v.attributes.appVersionState || v.attributes.appStoreState}`);
  const loc = await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
  const l = loc.json.data.find((x) => x.attributes.locale === 'en-US');
  const r = await patch(`/v1/appStoreVersionLocalizations/${l.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: l.id,
      attributes: { description, whatsNew, supportUrl, marketingUrl } },
  });
  console.log('patch status:', r.status, r.ok ? '' : r.text.slice(0, 400));
  const after = await get(`/v1/appStoreVersionLocalizations/${l.id}`);
  const a = after.json.data.attributes;
  console.log('description now contains PRACTISE:', /PRACTISE/.test(a.description || ''));
  console.log('supportUrl:', a.supportUrl, '| marketingUrl:', a.marketingUrl);
  console.log('whatsNew:', JSON.stringify(a.whatsNew));
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
