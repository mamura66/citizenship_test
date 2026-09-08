// After `eas submit`: wait until Apple has processed the build, make sure the App Store
// version exists, and attach the build to it. Run once the submission shows FINISHED.
//
//   node tools/asc/attach-build.js 1.0.1 8
//
// Apple processes an uploaded build for 5-15 minutes before it can be attached; until
// then it is PROCESSING and any attach attempt is rejected. This waits, up to 30 minutes.
const { get, post, patch, APP_ID } = require('./asc');
const [versionString, buildNumber] = process.argv.slice(2);
if (!versionString || !buildNumber) { console.error('usage: attach-build.js <version> <buildNumber>'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // 1. the build, once VALID
  let build = null;
  for (let i = 0; i < 60; i++) {
    const b = await get(`/v1/builds?filter[app]=${APP_ID}&filter[version]=${buildNumber}&limit=5`);
    build = (b.json.data || []).find((x) => String(x.attributes.version) === String(buildNumber)) || null;
    const st = build ? build.attributes.processingState : 'not arrived';
    console.log(`build ${buildNumber}: ${st}`);
    if (st === 'VALID') break;
    if (st === 'FAILED' || st === 'INVALID') throw new Error(`Apple rejected build ${buildNumber}: ${st}`);
    await sleep(30000);
  }
  if (!build || build.attributes.processingState !== 'VALID') throw new Error('build not VALID after 30 minutes');

  // 2. the version, created if EAS did not
  const vs = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=5`);
  let version = (vs.json.data || []).find((v) => v.attributes.versionString === versionString);
  if (!version) {
    const r = await post('/v1/appStoreVersions', { data: { type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } } } });
    if (!r.ok) throw new Error('could not create version: ' + r.text.slice(0, 300));
    version = r.json.data; console.log(`created version ${versionString}`);
  } else console.log(`version ${versionString} exists: ${version.attributes.appVersionState || version.attributes.appStoreState}`);

  // 3. attach
  const a = await patch(`/v1/appStoreVersions/${version.id}/relationships/build`, { data: { type: 'builds', id: build.id } });
  if (!a.ok) throw new Error('attach failed: ' + a.text.slice(0, 300));
  const check = await get(`/v1/appStoreVersions/${version.id}/build`);
  console.log('attached build:', check.json.data ? check.json.data.attributes.version : 'NONE');
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });
