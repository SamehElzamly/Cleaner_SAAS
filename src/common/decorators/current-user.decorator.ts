import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Mirrors exactly what JwtAccessStrategy.validate() returns onto req.user —
// keep the two in sync if that return shape ever changes.
export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string | null;
  role: string;
}

// Usage: findAll(@CurrentUser() user: AuthenticatedUser) instead of
// @Req() req and then manually reading req.user with a cast every time.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
