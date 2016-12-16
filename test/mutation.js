const requestGraphQL = require('./client');

describe('mutation', function() {
  var objectId;

  it('should create new object', () => {
    return requestGraphQL(`
      mutation {
        Leaderboard(name: "jysperm", score: 10) {
          objectId, name, score
        }
      }
    `, {sessionToken: true}).then( res => {
      const leaderboard = res.body.data.Leaderboard;
      objectId = leaderboard.objectId;

      leaderboard.should.be.include({
        name: 'jysperm',
        score: 10
      });
    });
  });

  it('should modify exists object', () => {
    return requestGraphQL(`
      mutation {
        Leaderboard(objectId: "${objectId}", score: 20) {
          score
        }
      }
    `, {sessionToken: true}).then( res => {
      res.body.data.Leaderboard.score.should.be.equal(20);
    });
  });
});
