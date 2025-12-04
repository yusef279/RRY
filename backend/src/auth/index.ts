// guards
export * from './guards/jwt-auth.guard';
export * from './guards/roles.guard';
// Alias for RolesGuard to match controller imports
export { RolesGuard as PermissionsGuard } from './guards/roles.guard';

// decorators
export * from './decorators/roles.decorators';

// constants
export { Permission, ROLE_PERMISSIONS, UserRole } from './permissions.constant';

// interfaces
export type { AuthUser, JwtPayload } from './auth-user.interface';

// module
export { AuthModule } from './auth.module';