const requestGraphQL = require('./client');

describe('query', function() {
  it('should populate relation', () => {
    return requestGraphQL(`
      query {
        TodoFolder {
          name, containedTodos {
            title, priority
          }
        }
      }
    `).then( res => {
      res.body.data.TodoFolder.forEach(todoFolder => {
        todoFolder.name.should.be.a('string');
        todoFolder.containedTodos.forEach( todo => {
          todo.title.should.be.a('string');
          todo.priority.should.be.a('number');
        });
      });
    });
  });

  it('should populate pointer', () => {
    return requestGraphQL(`
      query {
        Todo(limit: 1) {
          title, owner {
            username, email
          }
        }
      }
    `).then( res => {
      res.body.data.Todo[0].title.should.be.a('string');
      res.body.data.Todo[0].owner.username.should.be.a('string');
      res.body.data.Todo[0].owner.email.should.be.a('string');
    });
  });

  it('should work with multi-level relation', () => {
    return requestGraphQL(`
      query {
        TodoFolder {
          name,
          containedTodos {
            title, owner {
              username, email
            }
          }
        }
      }
    `).then( res => {
      res.body.data.TodoFolder.forEach(todoFolder => {
        todoFolder.containedTodos.forEach( todo => {
          todo.owner.username.should.be.a('string');
          todo.owner.email.should.be.a('string');
        });
      });
    });
  });
});
