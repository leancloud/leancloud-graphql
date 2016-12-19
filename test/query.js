const requestGraphQL = require('./client');

describe('query', function() {
  it('should get all objects', () => {
    return requestGraphQL(`
      query {
        Todo {
          objectId, title, priority, createdAt
        }
      }
    `).then( res => {
      res.body.data.Todo.forEach( ({objectId, title, priority, createdAt}) => {
        objectId.should.be.a('string');
        title.should.be.a('string');
        priority.should.be.a('number');
        createdAt.should.be.a('string');
      });
    });
  });

  it('should sort by priority', () => {
    return requestGraphQL(`
      query {
        Todo(ascending: priority) {
          title, priority
        }
      }
    `).then( res => {
      res.body.data.Todo.reduce( (previous, {priority}) => {
        priority.should.least(previous);
        return priority;
      }, -Infinity);
    });
  });

  it('should get only 2 objects', () => {
    return requestGraphQL(`
      query {
        Todo(limit: 2) {
          title, priority
        }
      }
    `).then( res => {
      res.body.data.Todo.length.should.be.equal(2);
    });
  });

  it('should get object by id', () => {
    return requestGraphQL(`
      query {
        Todo(objectId: "5853a0e5128fe1006b5ce449") {
          title
        }
      }
    `).then( res => {
      res.body.data.Todo.length.should.be.equal(1);
      res.body.data.Todo[0].title.should.be.equal('还信用卡账单');
    });
  });
});
