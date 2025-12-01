import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from './auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'super-secret',
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    console.log('🔍 JWT payload in validate:', payload);
    return {
      userId: payload.userId,      // ← Changed from payload.sub
      email: payload.email,
      role: payload.role,
      employeeId: payload.employeeId,
      departmentId: payload.departmentId,
    };
  }
}