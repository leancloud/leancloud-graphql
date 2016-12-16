const supertest = require('supertest-as-promised');
const chai = require('chai');

const server = require('../server');

chai.Should();

module.exports = function requestGraphQL(query, {sessionToken} = {}) {
  return supertest(server).post('/')
    .set('Content-Type', 'application/graphql')
    .set('X-LC-Session', sessionToken ? 'spoe8e2i1x6tyyip1eywe1siz' : '')
    .send(query);
}
