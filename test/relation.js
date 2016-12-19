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
          if (todo.owner) {
            todo.owner.username.should.be.a('string');
            todo.owner.email.should.be.a('string');
          }
        });
      });
    });
  });

  it('should populate reverse pointer', () => {
    return requestGraphQL(`
      query {
        _User {
          username, ownerOfTodo {
            title
          }
        }
      }
    `).then( res => {
      res.body.data._User.forEach( user => {
        user.ownerOfTodo.forEach( todo => {
          todo.title.should.be.a('string');
        });
      });
    });
  });

  it('should populate reverse relation', () => {
    return requestGraphQL(`
      query {
        Todo {
          containedTodosOfTodoFolder {
            name
          }
        }
      }
    `).then( res => {
      res.body.data.Todo.forEach( todo => {
        todo.containedTodosOfTodoFolder.forEach( todoFolder => {
          todoFolder.name.should.be.a('string');
        });
      });
    });
  });
});
