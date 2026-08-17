import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '@omniops/shared';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    // SUPER_ADMIN always has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const userPermissions = user.permissions ?? {};

    // Check for wildcard "all" permission
    if (userPermissions.all === true) {
      return true;
    }

    return requiredPermissions.every(
      (perm) => userPermissions[perm] === true,
    );
  }
}
