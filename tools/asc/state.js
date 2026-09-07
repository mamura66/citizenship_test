const { get, APP_ID } = require('./asc');
(async () => {
  const v = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=1`);
  const ver = v.json.data[0];
  console.log('version', ver.attributes.versionString, '| state', ver.attributes.appVersionState || ver.attributes.appStoreState);
  console.log('  versionId', ver.id);
  const rd = await get(`/v1/appStoreVersions/${ver.id}/appStoreReviewDetail`);
  const d = rd.json && rd.json.data;
  console.log('  reviewDetailId', d ? d.id : 'none', '| notes', d ? (d.attributes.notes || '').length + ' chars' : '-');
  const b = await get(`/v1/appStoreVersions/${ver.id}/build`);
  console.log('  build attached', b.json && b.json.data ? 'yes' : 'NO');
  const p = await get(`/v1/apps/${APP_ID}/inAppPurchasesV2?limit=5`);
  for (const x of p.json.data || []) console.log('  iap', x.attributes.productId.padEnd(17), x.attributes.state);
})();
