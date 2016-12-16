const AV = require('leanengine');

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
});

const app = require('./app');
const port = process.env.LEANCLOUD_APP_PORT || 3000;

app.listen(port, () => {
  console.log('LeanCloud GraphQL is started on', port);
});

module.exports = app;
