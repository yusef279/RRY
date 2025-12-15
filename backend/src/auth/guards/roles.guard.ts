import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/roles.decorators';
import { Permission, ROLE_PERMISSIONS } from '../permissions.constant';
import { AuthUser } from '../auth-user.interface';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // No permissions required => allow
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User not authenticated or role missing');
    }

    // ✅ Collect roles (primary + multi-role)
    const rolesToCheck = [user.role, ...(user.roles ?? [])].filter(Boolean);

    // ✅ SYSTEM_ADMIN always has full access - bypass all permission checks
    const isSystemAdmin = rolesToCheck.some((r) => r === SystemRole.SYSTEM_ADMIN);
    if (isSystemAdmin) {
      console.log('✅ SYSTEM_ADMIN bypass: granting access to', request.url);
      return true;
    }

    // ✅ Collect permissions:
    // 1) embedded permissions (JWT) if present
    const directPerms = (user.permissions ?? []) as Permission[];

    // 2) derive from role-permissions mapping
    const roleDerivedPerms = rolesToCheck.flatMap((r) => ROLE_PERMISSIONS[r] ?? []);

    const effectivePermissions = new Set<Permission>([
      ...directPerms,
      ...roleDerivedPerms,
    ]);

    const hasPermission = requiredPermissions.some((p) =>
      effectivePermissions.has(p),
    );

    if (!hasPermission) {
      // Helpful debug
      console.error('❌ Permission denied:', {
        user: user.email,
        role: user.role,
        roles: user.roles,
        required: requiredPermissions,
        directPerms,
        roleDerivedPerms,
        endpoint: request.url,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
