// OpenAPI 3.1 built from the Zod schemas every route validates with (TRD §4.1,
// §14), served at GET /api/v1/openapi.json. Routes are found by walking Nest's
// controllers, so a new route appears without being listed anywhere.
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { ErrorEnvelope } from '@bhojnalya/contracts';
import { Controller, Get, Inject, Injectable, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import type { z } from 'zod';

import { Public } from '../tenancy/public.decorator.js';
import { routeSchemasOf } from '../validation/zod.js';

export const API_PREFIX = 'api/v1';
// Served outside the prefix: uptime checks call /healthz (TRD §16).
export const UNPREFIXED_ROUTES = ['healthz'];

export type OpenApiDocument = ReturnType<OpenApiGeneratorV31['generateDocument']>;

@Injectable()
export class OpenApiDocumentBuilder {
  private document: OpenApiDocument | undefined;

  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
    @Inject(MetadataScanner) private readonly scanner: MetadataScanner,
  ) {}

  build(): OpenApiDocument {
    this.document ??= new OpenApiGeneratorV31(this.registry().definitions).generateDocument({
      openapi: '3.1.0',
      info: { title: 'Bhojnalya API', version: '1' },
    });
    return this.document;
  }

  private registry(): OpenAPIRegistry {
    const registry = new OpenAPIRegistry();
    for (const wrapper of this.discovery.getControllers()) {
      const controller = wrapper.metatype as (new (...args: never[]) => unknown) | null;
      if (!controller) continue;
      const prototype = controller.prototype as object;
      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const route = routeOf(controller, prototype, name);
        if (route) registry.registerPath(route);
      }
    }
    return registry;
  }
}

@Controller()
export class OpenApiController {
  constructor(@Inject(OpenApiDocumentBuilder) private readonly builder: OpenApiDocumentBuilder) {}

  @Public()
  @Get('openapi.json')
  document(): OpenApiDocument {
    return this.builder.build();
  }
}

function routeOf(controller: object, prototype: object, name: string): RouteConfig | undefined {
  const handler = (prototype as Record<string, unknown>)[name];
  if (typeof handler !== 'function') return undefined;
  const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
  const method = requestMethod === undefined ? undefined : METHODS[requestMethod];
  if (method === undefined) return undefined;
  const path = fullPath(
    Reflect.getMetadata(PATH_METADATA, controller) as string | undefined,
    Reflect.getMetadata(PATH_METADATA, handler) as string | undefined,
  );
  const schemas = routeSchemasOf(prototype, name);
  const { body, query, params } = schemas.request;
  return {
    method,
    path,
    request: {
      ...(body ? { body: { content: { 'application/json': { schema: body } } } } : {}),
      ...(query ? { query: query as z.ZodObject } : {}),
      ...(params ? { params: params as z.ZodObject } : {}),
    },
    responses: {
      ...Object.fromEntries(
        Object.entries(schemas.responses).map(([status, response]) => [
          status,
          {
            description: response.description,
            ...(response.schema
              ? { content: { 'application/json': { schema: response.schema } } }
              : {}),
          },
        ]),
      ),
      default: {
        description: 'Any error',
        content: { 'application/json': { schema: ErrorEnvelope } },
      },
    },
  };
}

// Only the methods a route here uses; any other is left out of the document.
const METHODS: Partial<Record<RequestMethod, RouteConfig['method']>> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.DELETE]: 'delete',
};

// '/:id' → '/{id}', with the global prefix unless the route is served outside it.
function fullPath(controllerPath = '', handlerPath = ''): string {
  const route = [controllerPath, handlerPath]
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter((part) => part !== '')
    .join('/');
  const prefixed = UNPREFIXED_ROUTES.includes(route) ? route : `${API_PREFIX}/${route}`;
  return `/${prefixed}`.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}
