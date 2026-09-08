// The last click: put a prepared version in front of App Review.
//
//   node tools/asc/submit-for-review.js 1.0.1
//
// Uses Apple's current review-submission flow: create a submission for the app, add the
// version as its item, then mark it submitted. Refuses to run unless the version has a
// build attached and the description no longer says PRACTISE - the two things this
// release exists to fix should not be possible to ship without.
const { get, post, patch, APP_ID } = require('./asc');
const want = process.argv[2];
if (!want) { console.error('usage: submit-for-review.js <version>'); process.exit(2); }

(async () => {
  const vs = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=5`);
  const v = (vs.json.data || []).find((x) => x.attributes.versionString === want);
  if (!v) throw new Error(`no version ${want}`);
  const b = await get(`/v1/appStoreVersions/${v.id}/build`);
  if (!b.json.data) throw new Error('no build attached - run attach-build.js first');
  const loc = await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
  const l = loc.json.data.find((x) => x.attributes.locale === 'en-US');
  if (/PRACTISE/.test(l.attributes.description || '')) throw new Error('description still says PRACTISE - run set-version-metadata.js first');
  console.log(`version ${want}: build ${b.json.data.attributes.version} attached, description clean`);

  const rs = await post('/v1/reviewSubmissions', { data: { type: 'reviewSubmissions',
    attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP_ID } } } } });
  if (!rs.ok) throw new Error('create reviewSubmission failed: ' + rs.text.slice(0, 400));
  const sub = rs.json.data;
  const item = await post('/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems',
    relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } } } });
  if (!item.ok) throw new Error('add item failed: ' + item.text.slice(0, 400));
  const go = await patch(`/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } });
  if (!go.ok) throw new Error('submit failed: ' + go.text.slice(0, 400));
  console.log(`submitted for review: ${sub.id} -> ${go.json.data.attributes.state}`);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
