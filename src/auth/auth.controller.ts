import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from './dto/user-auth.dto.js';
import { LoginDto } from './dto/Login.dto.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';

// Previously `extends Request` with no import — without an explicit
// `import type { Request } from 'express'`, a bare `Request` can resolve to
// the DOM fetch-API Request (if "dom" is in tsconfig's lib) instead of
// Express's, a different and incompatible shape from what @Req() actually
// injects at runtime. Fixed by importing Express's type explicitly above.
interface RequestWithUser extends Request {
  user: { userId: string; email: string; tenantId: string | null; role: string; refreshToken?: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body.email, body.password);
  }

  @Post('signup')
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.authService.create(createUserDto);
  }

  // Protected route to verify an access token is still valid.
  // GET /auth/verify  (Authorization: Bearer <accessToken>)
  @UseGuards(JwtAccessGuard)
  @Get('verify')
  async verify(@Req() req: RequestWithUser) {
    const user = await this.authService.verifyUser(req.user.userId);
    return { valid: true, user };
  }

  // POST /auth/refresh  (Authorization: Bearer <refreshToken>)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req: RequestWithUser) {
    return await this.authService.refreshTokens(req.user.userId, req.user.refreshToken as string);
  }

  // POST /auth/logout  (Authorization: Bearer <accessToken>)
  @UseGuards(JwtAccessGuard)
  @Post('logout')
  async logout(@Req() req: RequestWithUser) {
    return await this.authService.logout(req.user.userId);
  }
}