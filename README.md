# LeanCloud GraphQL
运行在云引擎上的第三方 GraphQL 支持，允许你用 GraphQL 查询 LeanCloud 云存储中的所有数据。

<!-- toc -->

- [部署到云引擎](#%E9%83%A8%E7%BD%B2%E5%88%B0%E4%BA%91%E5%BC%95%E6%93%8E)
- [GraphQL](#graphql)
- [获取数据](#%E8%8E%B7%E5%8F%96%E6%95%B0%E6%8D%AE)
- [查询](#%E6%9F%A5%E8%AF%A2)
- [关系](#%E5%85%B3%E7%B3%BB)
- [创建和更新](#%E5%88%9B%E5%BB%BA%E5%92%8C%E6%9B%B4%E6%96%B0)
- [添加到现有项目](#%E6%B7%BB%E5%8A%A0%E5%88%B0%E7%8E%B0%E6%9C%89%E9%A1%B9%E7%9B%AE)
  * [作为中间件添加](#%E4%BD%9C%E4%B8%BA%E4%B8%AD%E9%97%B4%E4%BB%B6%E6%B7%BB%E5%8A%A0)
  * [获取 GraphQLSchema](#%E8%8E%B7%E5%8F%96-graphqlschema)

<!-- tocstop -->

## 部署到云引擎

[![Deploy to LeanEngine](http://ac-32vx10b9.clouddn.com/109bd02ee9f5875a.png)](https://leancloud.cn/1.1/engine/deploy-button)

## GraphQL

[GraphQL](http://graphql.org/) 是 FaceBook 开源的一套查询语言，你可以用它定义数据的格式和获取方法（这就是 leancloud-graphql 做的工作，它会自动将你在 LeanCloud 的数据结构转换为 GraphQL 的 Schema），然后便可以在客户端以一种非常灵活的语法来获取数据，甚至也可以用它来创建和更新数据。

在使用 leancloud-graphql 之前，你可能需要先了解一下 [GraphQL 的语法](http://graphql.org/learn/queries/) ，下面我们不会过多地介绍 GraphQL 本身。这篇文章将使用 JavaScript SDK 文档中的 [示例数据结构](https://leancloud.cn/docs/leanstorage_guide-js.html#示例数据结构) 进行讲解。

GraphQL 在客户端几乎不需要什么 SDK，你可以花几行代码封装一个工具函数：

```javascript
function requestGraphQL(query) {
  return fetch('/', {
    method: 'POST',
    body: query
  }).then( res => {
    return res.json();
  }).then( result => {
    return result.data;
  });
}

requestGraphQL(`
  query {
    Todo {
      title, priority
    }
  }
`)
```

结果：

```javascript
{
  Todo: [
    {title: "紧急 Bug 修复", priority: 0},
    {title: "打电话给 Peter",priority: 5},
    {title: "还信用卡账单", priority: 10},
    {title: "买酸奶", priority: 10},
    {title: "团队会议", priority: 5}
  ]
}
```

我们也在云引擎的根路径（本地调试时为 <http://127.0.0.1:3000/>）用 GraphiQL 提供了一个支持自动补全等功能的 GraphQL 控制台，你可以在这里测试你的查询。

我们会应用客户端发来的 sessionToken，确保在用户的权限范围内进行查询。你可以从我们的 JavaScript SDK 上获取 sessionToken 并随着请求发送，修改 requestGraphQL：

```diff
  headers: {
    'Content-Type': 'application/graphql',
+   'X-LC-Session': AV.User.current() && AV.User.current().getSessionToken()
  },
```

## 获取数据

最简单的查询我们前面已经见过到了：

```graphql
query {
  Todo {
    title, priority
  }
}
```

默认会返回最多 100 条数据：

```javascript
{
  Todo: [
    {title: "紧急 Bug 修复", priority: 0},
    {title: "打电话给 Peter",priority: 5},
    {title: "还信用卡账单", priority: 10},
    {title: "买酸奶", priority: 10},
    {title: "团队会议", priority: 5}
  ]
}
```

你可以在此基础上添加排序、条数限制等选项：

- `ascending` 按照指定字段升序
- `descending` 按照指定字段降序
- `limit` 条数限制
- `skip` 跳过指定条数

例如我们按照优先级升序排序，取最重要的两个任务：

```graphql
query {
  Todo(ascending: "priority", limit: 2) {
    title, priority
  }
}
```

结果：

```
{
  Todo: [
    {title: "紧急 Bug 修复", priority: 0},
    {title: "打电话给 Peter",priority: 5}
  ]
}
```

## 查询

首先你可以按照 objectId 进行简单的查询：

```graphql
query {
  Todo(objectId: "5853a0e5128fe1006b5ce449") {
    title, priority
  }
}
```

结果：

```
{
  Todo: [
    {title: "还信用卡账单", priority: 10}
  ]
}
```

## 关系

如果对象的一个字段是 Relation，那么你就可以在 GraphQL 中将它展开，例如我们可以查询每个 TodoFolder 中包含的 Todo：

```graphql
query {
  TodoFolder {
    name, containedTodos {
      title, priority
    }
  }
}
```

结果：

```javascript
{
  TodoFolder: [{
    name: "工作",
    containedTodos: [
      {title: "紧急 Bug 修复", priority: 0},
      {title: "打电话给 Peter", priority: 5},
      {title: "团队会议", priority: 5}
    ]
  }, {
    name: "购物清单",
    containedTodos: [
      {title: "买酸奶", priority: 10}
    ]
  }]
}
```

如果一个字段是 Pointer 你也可以将它展开，例如我们可以查询 Todo 的创建者（到用户表的指针）：

```graphql
query {
  Todo(limit: 1) {
    title, owner {
      username, email
    }
  }
}
```

结果：

```javascript
{
  Todo: [
    {
      title: "紧急 Bug 修复",
      owner: {
        username: "someone",
        email: "test@example.com"
      }
    }
  ]
}
```

在 GraphQL 中你甚至可以进行多层级的关系查询：

```graphql
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
```

结果（省略了一部分）：

```javascript
{
  TodoFolder: [{
    name: "工作",
    containedTodos: [{
      title: "紧急 Bug 修复",
      owner: {
        username: "someone",
        email: "test@example.com"
      }
    }, // ...
    ]
  }, // ...
  ]
}
```

## 创建和更新

你可以这样创建一个对象，并要求服务器返回 objectId、标题和优先级：

```graphql
mutation {
  Todo(title: "思考巨石阵是如何修建的") {
    objectId, title, priority
  }
}
```

结果：

```javascript
{
  Todo: {
    objectId: "5853adb7b123db006562f83b",
    title: "思考巨石阵是如何修建的",
    priority: 10
  }
}
```

然后你可以用非常相似的语法来更新这个对象（当你提供了 objectId 便是更新对象）：

```graphql
mutation {
  Todo(objectId: "5853adb7b123db006562f83b", priority: 5) {
    title, priority
  }
}
```

结果：

```javascript
{
  Todo: {
    title: "思考巨石阵是如何修建的",
    priority: 5
  }
}
```

## 添加到现有项目

如果要添加到现有项目，需要先将 leancloud-graphql 添加为依赖：

    npm install --save leancloud-graphql

请确保 Node.js 版本在 4.0 以上。

### 作为中间件添加

leancloud-graphql 导出了一个 express 中间件，可以直接添加到现有的 express 项目上：

```javascript
var leancloudGraphQL = require('leancloud-graphql').express;
var app = express();
app.use(leancloudGraphQL());
```

leancloudGraphQL 有一些选项：

- `graphiql` 开启调试控制台，默认 true.
- `cors` 提供跨域支持，默认 true.
- `pretty` 格式化返回的 JSON。

使用该中间件时请确保环境变量中有 `LEANCLOUD_` 系列的环境变量，即需要运行在云引擎上或用 `lean up` 启动。

### 获取 GraphQLSchema

leancloud-graphql 默认导出了一个构建 GraphQLSchema 的函数：

```javascript
var buildSchema = require('leancloud-graphql');
var {printSchema} = require('graphql');

buildSchema({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
}).then( schema => {
  console.log(printSchema(schema));
});
```
