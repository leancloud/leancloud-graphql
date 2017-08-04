const {Router} = require('express');
const bodyParser = require('body-parser');
const expressGraphql = require('express-graphql');
const _ = require('lodash');

const buildSchema = require('./schema');

module.exports = function({graphiql, cors, pretty} = {graphiql: true, cors: true}) {
  const router = new Router();

  if (cors) {
    router.use(require('cors')({
      allowedHeaders: ['X-LC-Session', 'Content-Type'],
      maxAge: 86400
    }));
  }

  router.use(bodyParser.text({type: ['text/plain', 'application/graphql']}));
  router.use(bodyParser.json());

  const expressGraphqlReady = buildSchema({
    appId: process.env.LEANCLOUD_APP_ID,
    appKey: process.env.LEANCLOUD_APP_KEY,
    masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
  }).then( schema => {
    return expressGraphql({schema, graphiql, pretty});
  });

  router.use(function leancloudGraphQL(req, res, next) {
    req.authOptions = {
      sessionToken: req.headers['x-lc-session']
    };

    if (_.isString(req.body)) {
      req.body = {
        query: req.body
      };
    }

    expressGraphqlReady.then( expressGraphqlMiddleware => {
      expressGraphqlMiddleware(req, res, next);
    }).catch(next);
  });

  return router;
}
