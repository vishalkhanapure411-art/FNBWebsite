import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * TenantGuard enforces tenant isolation.
 * It extracts tenantId from the JWT and scopes all queries.
 * For SUPER_ADMIN, tenantId is optional (they can see all tenants).
 *
 * The guard sets a `tenantScope` property on the request that
 * services can use to filter queries.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // No user = unauthenticated; let JwtAuthGuard handle that
      return true;
    }

    // SUPER_ADMIN can see everything
    if (user.role === 'SUPER_ADMIN') {
      request.tenantScope = { tenantId: null }; // null = no filter
      return true;
    }

    // All other roles MUST have a tenantId
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant ID is required for this operation');
    }

    request.tenantScope = { tenantId: user.tenantId };
    return true;
  }
}
