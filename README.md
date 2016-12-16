# LeanCloud GraphQL
运行在云引擎上的第三方 GraphQL 支持，允许你用 GraphQL 查询 LeanCloud 云存储中的所有数据。

## 部署到云引擎

[![Deploy to LeanEngine](http://ac-32vx10b9.clouddn.com/109bd02ee9f5875a.png)](https://leancloud.cn/1.1/engine/deploy-button)

## GraphQL

[GraphQL](http://graphql.org/) 是 FaceBook 开源的一套查询语言，你可以用它定义数据的格式和获取方法（这就是 leancloud-graphql 做的工作，它会自动将你在 LeanCloud 的数据结构转换为 GraphQL 的 Schema），然后便可以在客户端以一种非常灵活的语法来获取数据，甚至也可以用它来创建和更新数据。

在使用该组件之前，你可能需要先了解一下 [GraphQL 的语法](http://graphql.org/learn/queries/) ，下面我们不会过多地介绍 GraphQL 本身。这篇文章将使用 JavaScript SDK 文档中的 [示例数据结构](https://leancloud.cn/docs/leanstorage_guide-js.html#示例数据结构) 进行讲解。

GraphQL 在客户端几乎不需要什么 SDK，你可以花几行代码封装一个工具函数：

```javascript
function requestGraphQL(query) {
  return fetch('/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/graphql'
    },
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

我们也在云引擎的根路径（本地调试时为 <http://127.0.0.1:3000/>）用 express-graphql 提供了一个支持自动补全等功能的 GraphQL 控制台，你可以在这里测试你的查询。

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

TODO

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

## 进阶话题

TODO
