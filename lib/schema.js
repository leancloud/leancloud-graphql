const request = require('request-promise');
const {GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLFloat, GraphQLBoolean, GraphQLInt} = require('graphql');
const _ = require('lodash');
const AV = require('leanengine');

const appId = process.env.LEANCLOUD_APP_ID;
const appKey = process.env.LEANCLOUD_APP_KEY;
const masterKey = process.env.LEANCLOUD_APP_MASTER_KEY;

const LCTypeMapping = {
  String: GraphQLString,
  Number: GraphQLFloat,
  Boolean: GraphQLBoolean,

  // TODO
  Object: GraphQLString,
  Array: GraphQLString,
  Date: GraphQLString,
  Relation: GraphQLString,
  Pointer: GraphQLString
}

module.exports = function prepareSchema() {
  return request({
    url: 'https://api.leancloud.cn/1.1/schemas',
    json: true,
    headers: {
      'X-LC-Id': appId,
      'X-LC-Key': `${masterKey},master`
    }
  }).then( cloudSchemas => {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'LeanStorage',
        fields: _.mapValues(cloudSchemas, (schema, className) => {
          return {
            name: className,
            type: new GraphQLList(new GraphQLObjectType({
              name: className,
              fields: _.mapValues(schema, (definition, field) => {
                return {
                  type: LCTypeMapping[definition.type],
                  resolve: (source, args, context, info) => {
                    return source.get(field);
                  }
                }
              })
            })),
            args: {
              ascending: {
                type: GraphQLString
              },
              descending: {
                type: GraphQLString
              },
              limit: {
                type: GraphQLInt
              },
              skip: {
                type: GraphQLInt
              }
            },
            resolve: (source, args, {authOptions}, info) => {
              return new AV.Query(className).find(authOptions);
            }
          };
        })
      })
    });
  });
};
