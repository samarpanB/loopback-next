// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  ReferenceObject,
  RequestBodyObject,
  SchemaObject,
  SchemasObject,
} from '@loopback/openapi-v3-types';
import * as AJV from 'ajv';
import * as debugModule from 'debug';
import * as _ from 'lodash';
import * as util from 'util';
import {HttpErrors, RequestBody, RestHttpErrors} from '..';
import {RequestBodyValidationOptions} from '../types';

const toJsonSchema = require('openapi-schema-to-json-schema');
const debug = debugModule('loopback:rest:validation');

/**
 * Check whether the request body is valid according to the provided OpenAPI schema.
 * The JSON schema is generated from the OpenAPI schema which is typically defined
 * by `@requestBody()`.
 * The validation leverages AJV schema validator.
 * @param body - The request body parsed from an HTTP request.
 * @param requestBodySpec - The OpenAPI requestBody specification defined in `@requestBody()`.
 * @param globalSchemas - The referenced schemas generated from `OpenAPISpec.components.schemas`.
 * @param options - Request body validation options for AJV
 */
export function validateRequestBody(
  body: RequestBody,
  requestBodySpec?: RequestBodyObject,
  globalSchemas: SchemasObject = {},
  options: RequestBodyValidationOptions = {},
) {
  const required = requestBodySpec && requestBodySpec.required;

  if (required && body.value == null) {
    const err = Object.assign(
      new HttpErrors.BadRequest('Request body is required'),
      {
        code: 'MISSING_REQUIRED_PARAMETER',
        parameterName: 'request body',
      },
    );
    throw err;
  }

  const schema = body.schema;
  /* istanbul ignore if */
  if (debug.enabled) {
    debug('Request body schema: %j', util.inspect(schema, {depth: null}));
  }
  if (!schema) return;

  options = Object.assign({coerceTypes: !!body.coercionRequired}, options);
  validateValueAgainstSchema(body.value, schema, globalSchemas, options);
}

/**
 * Convert an OpenAPI schema to the corresponding JSON schema.
 * @param openapiSchema - The OpenAPI schema to convert.
 */
function convertToJsonSchema(openapiSchema: SchemaObject) {
  const jsonSchema = toJsonSchema(openapiSchema);
  delete jsonSchema['$schema'];
  /* istanbul ignore if */
  if (debug.enabled) {
    debug(
      'Converted OpenAPI schema to JSON schema: %s',
      util.inspect(jsonSchema, {depth: null}),
    );
  }
  return jsonSchema;
}

/**
 * Built-in cache for complied schemas by AJV
 */
const DEFAULT_COMPILED_SCHEMA_CACHE = new WeakMap<
  SchemaObject | ReferenceObject,
  AJV.ValidateFunction
>();

/**
 * Validate the request body data against JSON schema.
 * @param body - The request body data.
 * @param schema - The JSON schema used to perform the validation.
 * @param globalSchemas - Schema references.
 * @param options - Request body validation options.
 */
function validateValueAgainstSchema(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  schema: SchemaObject | ReferenceObject,
  globalSchemas: SchemasObject = {},
  options: RequestBodyValidationOptions = {},
) {
  let validate: AJV.ValidateFunction;

  const cache = options.compiledSchemaCache || DEFAULT_COMPILED_SCHEMA_CACHE;

  if (cache.has(schema)) {
    validate = DEFAULT_COMPILED_SCHEMA_CACHE.get(schema)!;
  } else {
    validate = createValidator(schema, globalSchemas, options);
    cache.set(schema, validate);
  }

  if (validate(body)) {
    debug('Request body passed AJV validation.');
    return;
  }

  const validationErrors = validate.errors;

  /* istanbul ignore if */
  if (debug.enabled) {
    debug(
      'Invalid request body: %s. Errors: %s',
      util.inspect(body, {depth: null}),
      util.inspect(validationErrors),
    );
  }

  const error = RestHttpErrors.invalidRequestBody();
  error.details = _.map(validationErrors, e => {
    return {
      path: e.dataPath,
      code: e.keyword,
      message: e.message,
      info: e.params,
    };
  });
  throw error;
}

function createValidator(
  schema: SchemaObject,
  globalSchemas?: SchemasObject,
  options?: RequestBodyValidationOptions,
): AJV.ValidateFunction {
  const jsonSchema = convertToJsonSchema(schema);

  const schemaWithRef = Object.assign({components: {}}, jsonSchema);
  schemaWithRef.components = {
    schemas: globalSchemas,
  };

  // See https://github.com/epoberezkin/ajv#options
  options = Object.assign(
    {},
    {
      allErrors: true,
      // nullable: support keyword "nullable" from Open API 3 specification.
      nullable: true,
    },
    options,
  );
  debug('AJV options', options);
  const ajv = new AJV(options);

  return ajv.compile(schemaWithRef);
}
