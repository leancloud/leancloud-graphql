const express = require('express');
const AV = require('leanengine');

const app = express();

app.use(AV.express());
app.use(require('./middleware')());

module.exports = app;
