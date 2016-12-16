const supertest = require('supertest-as-promised');
const chai = require('chai');

const server = require('../server');

chai.Should();

module.exports = function requestGraphQL(query) {
  return supertest(server).post('/')
    .set('Content-Type', 'application/graphql')
    .set('X-LC-Session', 'gu7lkr904dciry8uzzzoaopkt')
    .send(query);
}
