const AV = require('leanengine');

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
});

AV.Cloud.useMasterKey();

const app = require('./app');
const port = process.env.LEANCLOUD_APP_PORT || 3000;

app.listen(port, () => {
  console.log('SniperaaS is started on', port);
});
