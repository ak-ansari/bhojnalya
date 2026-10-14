// Zod at the HTTP boundary (TRD §4.1, §14). `@ZodBody`, `@ZodQuery` and
// `@ZodParams` validate through one pipe and record the schema on the handler;
// `@Returns` records the response. The OpenAPI document is built from the same
// records, so what is validated and what is documented cannot drift apart.
import 'reflect-metadata';

import { Body, Param, Query } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

import { ApiError } from '../errors/api-error.js';

export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw ApiError.validation(
        'The request is not valid.',
        parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
    return parsed.data;
  }
}

export type RequestPart = 'body' | 'query' | 'params';

export interface RouteSchemas {
  request: Partial<Record<RequestPart, z.ZodType>>;
  responses: Record<number, { schema?: z.ZodType; description: string }>;
}

export function ZodBody(schema: z.ZodType): ParameterDecorator {
  return recordAnd('body', schema, Body(new ZodValidationPipe(schema)));
}

export function ZodQuery(schema: z.ZodType): ParameterDecorator {
  return recordAnd('query', schema, Query(new ZodValidationPipe(schema)));
}

export function ZodParams(schema: z.ZodType): ParameterDecorator {
  return recordAnd('params', schema, Param(new ZodValidationPipe(schema)));
}

export function Returns(status: number, description: string, schema?: z.ZodType): MethodDecorator {
  return (target, key) => {
    const schemas = routeSchemasOf(target, key);
    schemas.responses[status] = schema ? { schema, description } : { description };
    Reflect.defineMetadata(ROUTE_SCHEMAS, schemas, target, key);
  };
}

export function routeSchemasOf(target: object, key: string | symbol): RouteSchemas {
  const existing = Reflect.getMetadata(ROUTE_SCHEMAS, target, key) as RouteSchemas | undefined;
  return existing ?? { request: {}, responses: {} };
}

const ROUTE_SCHEMAS = Symbol('bhojnalya:route-schemas');

function recordAnd(
  part: RequestPart,
  schema: z.ZodType,
  validate: ParameterDecorator,
): ParameterDecorator {
  return (target, key, index) => {
    if (key !== undefined) {
      const schemas = routeSchemasOf(target, key);
      schemas.request[part] = schema;
      Reflect.defineMetadata(ROUTE_SCHEMAS, schemas, target, key);
    }
    validate(target, key, index);
  };
}
