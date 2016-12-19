const request = require('request-promise');
const {GraphQLSchema, GraphQLObjectType, GraphQLScalarType , GraphQLList} = require('graphql');
const {GraphQLID, GraphQLString, GraphQLBoolean, GraphQLInt, GraphQLFloat} = require('graphql');
const _ = require('lodash');
const AV = require('leancloud-storage');

const LCDate = new GraphQLScalarType({
  name: 'Date',
  serialize: (date) => {
    return date.toJSON();
  }
});

const LCObject = new GraphQLScalarType({
  name: 'Object',
  serialize: (object) => {
    return object;
  }
});

const LCArray = new GraphQLScalarType({
  name: 'Array',
  serialize: (array) => {
    return array;
  }
});

const LCTypeMapping = {
  String: GraphQLString,
  Number: GraphQLFloat,
  Boolean: GraphQLBoolean,
  Date: LCDate,
  Object: LCObject,
  Array: LCArray
}

module.exports = function buildSchema({appId, appKey, masterKey}) {
  AV.init({appId, appKey, masterKey});

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

    const classSchemasFieldsThunk = _.mapValues(cloudSchemas, (schema, className) => {
      return () => {
        const fields = _.mapValues(schema, (definition, field) => {
          if (definition.type === 'Relation') {
            return {
              type: new GraphQLList(classSchemas[definition.className]),
              resolve: (source, args, {authOptions}, info) => {
                return source.relation(field).query().find(authOptions);
              }
            }
          } else if (definition.type === 'Pointer') {
            return {
              type: classSchemas[definition.className],
              resolve: (source, args, {authOptions}, info) => {
                return new AV.Query(definition.className).get(source.get(field).id, authOptions);
              }
            }
          } else {
            return {
              type: LCTypeMapping[definition.type],
              resolve: (source, args, context, info) => {
                return source.get(field);
              }
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
      }
    });

    const classSchemas = _.mapValues(cloudSchemas, (schema, className) => {
      return new GraphQLObjectType({
        name: className,
        fields: classSchemasFieldsThunk[className]
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
        name: 'LeanStorageMutation',
        fields: _.mapValues(cloudSchemas, (schema, className) => {
          return {
            name: className,
            type: classSchemas[className],
            args: _.omitBy(classSchemasFieldsThunk[className](), value => {
              return value.type instanceof GraphQLList || value.type instanceof GraphQLObjectType;
            }),
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
