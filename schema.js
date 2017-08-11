const {GraphQLSchema, GraphQLObjectType, GraphQLScalarType} = require('graphql');
const {GraphQLEnumType, GraphQLInputObjectType, GraphQLList} = require('graphql')
const {GraphQLID, GraphQLString, GraphQLBoolean, GraphQLInt, GraphQLFloat} = require('graphql');
const request = require('request-promise');
const AV = require('leancloud-storage');
const _ = require('lodash');

const debug = require('debug')('leancloud-graphql');

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

const LCFile = new GraphQLScalarType({
  name: 'File',
  serialize: (file) => {
    return file;
  }
});

const LCGeoPoint = new GraphQLScalarType({
  name: 'GeoPoint',
  serialize: (point) => {
    return point;
  }
});

const LCTypeMapping = {
  String: GraphQLString,
  Number: GraphQLFloat,
  Boolean: GraphQLBoolean,
  Date: LCDate,
  Object: LCObject,
  Array: LCArray,
  File: LCFile,
  GeoPoint: LCGeoPoint
}

module.exports = function buildSchema({appId, appKey, masterKey}) {
  return request({
    url: 'https://api.leancloud.cn/1.1/schemas',
    json: true,
    headers: {
      'X-LC-Id': appId,
      'X-LC-Key': `${masterKey},master`
    }
  }).then( cloudSchemas => {
    return _.mapValues(cloudSchemas, (schema, className) => {
      return _.omitBy(schema, (definition, field) => {
        if (field.startsWith('__')) {
          console.error(`[leancloud-graphql] Ignored invalid GraphQL field name \`${className}.${field}\``);
          return true;
        }
      });
    });
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
              args: querySchemas[classSchemas[definition.className]].args,
              resolve: (source, args, {authOptions}, info) => {
                return addArgumentsToQuery(source.relation(field).query(), args).find(authOptions);
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

        _.forEach(cloudSchemas, (schema, sourceClassName) => {
          _.forEach(schema, (definition, sourceField) => {
            if (definition.className === className) {
              debug(`Add reverse relationship: ${sourceField}Of${sourceClassName} on ${className}`);

              fields[`${sourceField}Of${sourceClassName}`] = {
                type: new GraphQLList(classSchemas[sourceClassName]),
                args: querySchemas[classSchemas[sourceClassName]].args,
                resolve: (source, args, {authOptions}, info) => {
                  return addArgumentsToQuery(new AV.Query(sourceClassName), args).equalTo(sourceField, source).find(authOptions);
                }
              };
            }
          });
        });

        return fields;
      }
    });

    const classSchemas = _.mapValues(cloudSchemas, (schema, className) => {
      return new GraphQLObjectType({
        name: className,
        fields: classSchemasFieldsThunk[className]
      });
    });

    const querySchemas = _.mapValues(cloudSchemas, (schema, className) => {
      const FieldsEnum = new GraphQLEnumType({
        name: `${className}Fields`,
        values: _.mapValues(schema, (definition, field) => {
          return {value: field};
        })
      });

      const createFieldsInputType = function(argName, innerType) {
        return new GraphQLInputObjectType({
          name: `${className}${_.upperFirst(argName)}Argument`,
          fields: _.pickBy(_.mapValues(schema, (definition, field) => {
            if (innerType) {
              return {type: innerType};
            } else if (LCTypeMapping[definition.type]) {
              return {
                type: LCTypeMapping[definition.type]
              };
            } else {
              return null;
            }
          }))
        });
      };

      return {
        name: className,
        type: new GraphQLList(classSchemas[className]),
        args: {
          objectId: {
            type: GraphQLID
          },
          ascending: {
            type: FieldsEnum
          },
          descending: {
            type: FieldsEnum
          },
          limit: {
            type: GraphQLInt
          },
          skip: {
            type: GraphQLInt
          },
          equalTo: {
            type: createFieldsInputType('equalTo')
          },
          greaterThan: {
            type: createFieldsInputType('greaterThan')
          },
          greaterThanOrEqualTo: {
            type: createFieldsInputType('greaterThanOrEqualTo')
          },
          lessThan: {
            type: createFieldsInputType('lessThan')
          },
          lessThanOrEqualTo: {
            type: createFieldsInputType('lessThanOrEqualTo')
          },
          contains: {
            type: createFieldsInputType('contains')
          },
          containedIn: {
            type: createFieldsInputType('containedIn', new GraphQLList(GraphQLID))
          },
          containsAll: {
            type: createFieldsInputType('containsAll', new GraphQLList(GraphQLID))
          },
          exists: {
            type: createFieldsInputType('exists', GraphQLBoolean)
          }
        },
        resolve: (source, args, {authOptions}, info) => {
          return addArgumentsToQuery(new AV.Query(className), args).find(authOptions);
        }
      };
    });

    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'LeanStorage',
        fields: querySchemas
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

function addArgumentsToQuery(query, args) {
  ['ascending', 'descending', 'limit', 'skip'].forEach( method => {
    if (args[method] !== undefined) {
      query[method](args[method]);
    }
  });

  ['equalTo', 'greaterThan', 'greaterThanOrEqualTo', 'lessThan',
   'lessThanOrEqualTo', 'contains', 'containedIn', 'containsAll'].forEach( method => {
    if (_.isObject(args[method])) {
      _.forEach(args[method], (value, key) => {
        query[method](key, value);
      });
    }
  });

  if (_.isObject(args.exists)) {
    _.forEach(args.exists, (value, key) => {
      if (value) {
        query.exists(key);
      } else {
        query.doesNotExist(key);
      }
    });
  }

  if (args.objectId) {
    query.equalTo('objectId', args.objectId);
  }

  return query;
}
