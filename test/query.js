const requestGraphQL = require('./client');

describe('query', function() {
  it('should get all objects', () => {
    return requestGraphQL(`
      query {
        NPMPackages {
          objectId, name, usersCount, createdAt
        }
      }
    `).then( res => {
      res.body.data.NPMPackages.forEach( ({objectId, name, usersCount, createdAt}) => {
        objectId.should.be.a('string');
        name.should.be.a('string');
        usersCount.should.be.a('number');
        createdAt.should.be.a('string');
      });
    });
  });

  it('should sort by usersCount', () => {
    return requestGraphQL(`
      query {
        NPMPackages(ascending: "usersCount") {
          name, usersCount
        }
      }
    `).then( res => {
      res.body.data.NPMPackages.reduce( (previous, {usersCount}) => {
        usersCount.should.least(previous);
        return usersCount;
      }, -Infinity);
    });
  });

  it('should get only 2 objects', () => {
    return requestGraphQL(`
      query {
        NPMPackages(limit: 2) {
          name, usersCount
        }
      }
    `).then( res => {
      res.body.data.NPMPackages.length.should.be.equal(2);
    });
  });

  it('should get object by id', () => {
    return requestGraphQL(`
      query {
        NPMPackages(objectId: "5852706c128fe10069815bcb") {
          name
        }
      }
    `).then( res => {
      res.body.data.NPMPackages.length.should.be.equal(1);
      res.body.data.NPMPackages[0].name.should.be.equal('leanengine');
    });
  });
});
