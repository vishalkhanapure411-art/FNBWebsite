import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@omniops/shared';

type AuthUser = { role: Role; siteId?: string | null };

/**
 * Restricts an endpoint to CENTRAL Controls users (and everyone else allowed
 * by the RolesGuard). Site-level CONTROLS (role === CONTROLS, siteId != null)
 * is rejected with 403 — central-only operations (recipe approval, product
 * management / price correction on the menu) are not available to site users.
 * Non-CONTROLS roles pass through untouched.
 */
@Injectable()
export class CentralControlsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest() as { user?: AuthUser };
    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }
    if (user.role === Role.CONTROLS && user.siteId != null) {
      throw new ForbiddenException('This operation is restricted to central Controls (site-level Controls cannot access it)');
    }
    return true;
  }
}