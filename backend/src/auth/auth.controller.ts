import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/roles.decorators';
import { Request } from 'express';
import { AuthUser } from './auth-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /* ----------  REGISTER  ---------- */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /* ----------  LOGIN  ---------- */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /* ----------  LOGOUT  ---------- */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request & { user: AuthUser }) {

    // ✅ Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Authorization token is missing');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const userId = req.user.userId;

    return this.auth.logout(userId, token);
  }
}