const request = require('request-promise');
const {GraphQLSchema, GraphQLObjectType, GraphQLScalarType , GraphQLList} = require('graphql');
const {GraphQLID, GraphQLString, GraphQLBoolean, GraphQLInt, GraphQLFloat} = require('graphql');
const _ = require('lodash');
const AV = require('leancloud-storage');

const appId = process.env.LEANCLOUD_APP_ID;
const appKey = process.env.LEANCLOUD_APP_KEY;
const masterKey = process.env.LEANCLOUD_APP_MASTER_KEY;

AV.init({appId, appKey, masterKey});

const LCData = new GraphQLScalarType({
  name: 'Date',
  serialize: (date) => {
    return date.toJSON()
  }
});

const LCTypeMapping = {
  String: GraphQLString,
  Number: GraphQLFloat,
  Boolean: GraphQLBoolean,
  Date: LCData,

  // TODO
  Object: GraphQLString,
  Array: GraphQLString,
  Relation: GraphQLString,
  Pointer: GraphQLString
}

module.exports = function prepareSchema(extraDefinitions) {
  return request({
    url: 'https://api.leancloud.cn/1.1/schemas',
    json: true,
    headers: {
      'X-LC-Id': appId,
      'X-LC-Key': `${masterKey},master`
    }
  }).then( cloudSchemas => {
    const classes = _.mapValues(cloudSchemas, (schema, className) => {
      return AV.Object.extend(className);
    });

    const classSchemasFields = _.mapValues(cloudSchemas, (schema, className) => {
      const fields = _.mapValues(schema, (definition, field) => {
        return {
          type: LCTypeMapping[definition.type],
          resolve: (source, args, context, info) => {
            return source.get(field);
          }
        }
      });

      fields.objectId = {
        type: GraphQLID,
        resolve: (source, args, context, info) => {
          return source.id;
        }
      };

      return fields;
    });

    const classSchemas = _.mapValues(cloudSchemas, (schema, className) => {
      return new GraphQLObjectType({
        name: className,
        fields: classSchemasFields[className]
      });
    });

    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'LeanStorage',
        fields: _.mapValues(cloudSchemas, (schema, className) => {
          return {
            name: className,
            type: new GraphQLList(classSchemas[className]),
            args: {
              objectId: {
                type: GraphQLID
              },
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
              const query = new AV.Query(className);

              ['ascending', 'descending', 'limit', 'skip'].forEach( method => {
                if (args[method] !== undefined) {
                  query[method](args[method]);
                }
              });

              if (args.objectId) {
                query.equalTo('objectId', args.objectId);
              }

              return query.find(authOptions);
            }
          };
        })
      }),

      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: _.mapValues(cloudSchemas, (schema, className) => {
          return {
            name: className,
            type: classSchemas[className],
            args: classSchemasFields[className],
            resolve: (source, args, {authOptions}, info) => {
              const saveOptions = _.extend({fetchWhenSave: true}, authOptions)

              if (args.objectId) {
                return AV.Object.createWithoutData(className, args.objectId).save(_.omit(args, 'objectId'), saveOptions);
              } else {
                return new classes[className]().save(args, saveOptions);
              }
            }
          }
        })
      })
    });
  });
};
