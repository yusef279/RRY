import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { AuthUser } from './auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.access_token || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'super-secret',
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    // IMPORTANT: preserve roles[] + permissions[] if present
    return {
      userId: payload.userId ?? payload.sub,
      email: payload.email,
      role: payload.role,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      employeeId: payload.employeeId,
      departmentId: payload.departmentId,
      positionId: payload.positionId,
    };
  }
}
