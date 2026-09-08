// Replace one App Store screenshot without a release.
//
//   node tools/asc/replace-screenshot.js <path/to/1284x2778.png> <position 1-based> [versionString]
//
// Screenshots are not version-locked, so this works on the live 1.0 today. Apple's upload
// is three steps - reserve, upload the bytes to the URLs it hands back, commit with an MD5 -
// and then the set is reordered so the new file sits where the old one was.
const fs = require('fs');
const crypto = require('crypto');
const { get, post, patch, del, api, APP_ID } = require('./asc');

const [file, posArg, wantVersion] = process.argv.slice(2);
if (!file || !posArg) { console.error('usage: replace-screenshot.js <png> <position> [version]'); process.exit(2); }
const position = Number(posArg);
const bytes = fs.readFileSync(file);

(async () => {
  const vs = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=5`);
  const v = wantVersion
    ? (vs.json.data || []).find((x) => x.attributes.versionString === wantVersion)
    : vs.json.data[0];
  if (!v) throw new Error('version not found');
  console.log(`version ${v.attributes.versionString}`);
  const loc = await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
  const l = loc.json.data.find((x) => x.attributes.locale === 'en-US');
  const sets = await get(`/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets?include=appScreenshots`);
  const set = sets.json.data.find((s) => s.attributes.screenshotDisplayType === 'APP_IPHONE_65');
  if (!set) throw new Error('no 6.5" screenshot set');
  const existing = (set.relationships.appScreenshots.data || []).map((d) => d.id);
  console.log(`6.5" set has ${existing.length} screenshots; replacing position ${position}`);
  if (position < 1 || position > existing.length) throw new Error('position out of range');

  // 1. reserve
  const res = await post('/v1/appScreenshots', { data: { type: 'appScreenshots',
    attributes: { fileName: require('path').basename(file), fileSize: bytes.length },
    relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } } });
  if (!res.ok) throw new Error('reserve failed: ' + res.text.slice(0, 300));
  const shot = res.json.data;
  // 2. upload each part
  for (const op of shot.attributes.uploadOperations) {
    const chunk = bytes.subarray(op.offset, op.offset + op.length);
    const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
    const up = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!up.ok) throw new Error(`upload part failed: ${up.status}`);
  }
  // 3. commit with checksum
  const md5 = crypto.createHash('md5').update(bytes).digest('hex');
  const commit = await patch(`/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id,
    attributes: { uploaded: true, sourceFileChecksum: md5 } } });
  if (!commit.ok) throw new Error('commit failed: ' + commit.text.slice(0, 300));
  // wait for Apple to process it
  for (let i = 0; i < 20; i++) {
    const s = await get(`/v1/appScreenshots/${shot.id}`);
    const st = s.json.data.attributes.assetDeliveryState?.state;
    if (st === 'COMPLETE') break;
    if (st === 'FAILED') throw new Error('Apple rejected the file: ' + JSON.stringify(s.json.data.attributes.assetDeliveryState));
    await new Promise((r) => setTimeout(r, 3000));
  }
  // 4. put it where the old one was, then delete the old one
  const order = [...existing]; order.splice(position - 1, 1, shot.id);
  const re = await patch(`/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`,
    { data: order.map((id) => ({ type: 'appScreenshots', id })) });
  if (!re.ok) throw new Error('reorder failed: ' + re.text.slice(0, 300));
  const old = existing[position - 1];
  const d = await del(`/v1/appScreenshots/${old}`);
  console.log(`replaced: new ${shot.id} at position ${position}, old ${old} deleted (${d.status})`);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
