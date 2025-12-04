import { ExecutionContext, Injectable, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorators';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Optional() @Inject(AuthService) private authService?: AuthService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    // Check if token is blacklisted (only if AuthService is available)
    if (this.authService) {
      const request = context.switchToHttp().getRequest();
      
      // Extract token from cookie or Authorization header
      const token = request.cookies?.access_token || 
        (request.headers.authorization?.startsWith('Bearer ') 
          ? request.headers.authorization.substring(7) 
          : null);
      
      if (token && this.authService.isTokenBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }
    
    return super.canActivate(context);
  }

  handleRequest(err, user) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing token');
    }
    return user;
  }
}
