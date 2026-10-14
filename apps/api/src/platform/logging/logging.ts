// Pino JSON logs (TRD §16): every request line carries requestId, tenantId,
// outletId and deviceId. The request id is the caller's X-Request-Id when it is
// sane, otherwise a fresh UUIDv7, and is echoed back and used in error bodies.
import type { IncomingMessage, ServerResponse } from 'node:http';

import { newId } from '@bhojnalya/contracts';
import type { Params } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

import type { ApiConfig } from '../config.js';
import type { ApiRequest } from '../http/api-request.js';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export function loggerParams(config: ApiConfig, destination?: DestinationStream): Params {
  const options = {
    level: config.LOG_LEVEL,
    genReqId,
    customProps: (req: IncomingMessage) => contextOf(req as ApiRequest),
    // Never log credentials.
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  };
  return { pinoHttp: destination ? [options, destination] : options };
}

function genReqId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()];
  const id = typeof incoming === 'string' && SANE_REQUEST_ID.test(incoming) ? incoming : newId();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

const SANE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

// Read again when the request completes, after the auth guard has run.
function contextOf(req: ApiRequest): Record<string, string | undefined> {
  return {
    requestId: typeof req.id === 'string' ? req.id : undefined,
    tenantId: req.principal?.tenantId,
    outletId: req.principal?.outletId,
    deviceId: req.principal?.deviceId,
  };
}
