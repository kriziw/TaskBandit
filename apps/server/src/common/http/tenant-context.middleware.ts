import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { buildTenantRequestContext, TenantRequestContext } from './request-url.util';

/**
 * Resolves the tenant request context (host header + original URL) once per
 * incoming request and attaches it to `req.tenantContext`.  All downstream
 * guards, controllers, and services can then read `req.tenantContext` instead
 * of re-computing it individually.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    req.tenantContext = buildTenantRequestContext(req);
    next();
  }
}

// Augment the Express Request interface so every controller that uses
// `@Req() request: Request` benefits from the typed property automatically.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantContext: TenantRequestContext;
    }
  }
}
