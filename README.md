# LeanCloud GraphQL
运行在云引擎上的第三方 GraphQL 支持，允许你用 GraphQL 查询 LeanCloud 云存储中的所有数据。

## 部署到云引擎

[![Deploy to LeanEngine](http://ac-32vx10b9.clouddn.com/109bd02ee9f5875a.png)](https://leancloud.cn/1.1/engine/deploy-button)

## GraphQL

GraphQL 是 FaceBook 开源的一套查询语言，你可以用它定义数据的格式和获取方法（这就是 leancloud-graphql 做的工作，它会自动将你在 LeanCloud 的数据结构转换为 GraphQL 的 Schema），然后便可以在客户端以一种非常灵活的语法来获取数据。

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
    {title: "还信用卡账单", priority: 10}
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

TODO

## 查询

TODO

## 关系

TODO

## 创建、更新和删除

TODO

## 进阶话题

TODO
