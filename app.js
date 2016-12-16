const express = require('express');
const bodyParser = require('body-parser');
const {graphql} = require('graphql');
const expressGraphql = require('express-graphql');
const AV = require('leanengine');
const parseLeancloudHeaders = require('leanengine/middleware/parse-leancloud-headers');
const cors = require('leanengine/middleware/cors');

const prepareSchema = require('./lib/schema');

const schemaReady = prepareSchema({});

const expressGraphqlReady = schemaReady.then( schema => {
  return expressGraphql({
    schema: schema,
    graphiql: true,
  });
});

const app = express();

app.use(AV.express());

app.use('/graphql', (req, res, next) => {
  expressGraphqlReady.done( expressGraphqlMiddleware => {
    expressGraphqlMiddleware(req, res, next);
  });
});

app.use(parseLeancloudHeaders(AV, {restrict: false}));
app.use(cors);

app.use(bodyParser.text({
  type: 'application/graphql'
}));

app.get('/', (req, res) => {
  res.redirect('/graphql');
})

app.post('/', (req, res) => {
  schemaReady.done( schema => {
    return graphql(schema, req.body, {}, {
      authOptions: {
        sessionToken: req.sessionToken,
      }
    }).then( result => {
      res.json(result);
    });
  });
});

module.exports = app;
