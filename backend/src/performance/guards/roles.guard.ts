import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../roles.decorater';


@Injectable()
export class RolesGuard implements CanActivate {
constructor(private reflector: Reflector) {}


canActivate(context: ExecutionContext): boolean {
const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
context.getHandler(),
context.getClass(),
]);
if (!requiredRoles) return true; // no role restriction


const { user } = context.switchToHttp().getRequest();
if (!user || !user.role) return false;


return requiredRoles.includes(user.role);
}
}