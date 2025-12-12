import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/roles.decorators';
import { Permission } from '../permissions.constant';
import { ROLE_PERMISSIONS } from '../permissions.constant';
import { AuthUser } from '../auth-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user || !user.role) {
      console.error('❌ Permission check failed: User not authenticated or role missing');
      throw new ForbiddenException('User not authenticated or role missing');
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];

    console.log('🔒 Permission check:', {
      user: user.email,
      role: user.role,
      requiredPermissions,
      userPermissions,
      endpoint: request.url,
    });

    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      console.error('❌ Permission denied:', {
        user: user.email,
        role: user.role,
        required: requiredPermissions,
        available: userPermissions,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}