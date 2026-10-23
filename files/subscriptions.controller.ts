import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../auth/entities/user.entity.js';

// A tenant's own admin (COMPANY) manages that tenant's subscription.
// tenantId always comes from the JWT.
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  private requireTenant(user: AuthenticatedUser): string {
    if (!user.tenantId) throw new ForbiddenException('No tenant associated with this account');
    return user.tenantId;
  }

  @Post()
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.subscribe(this.requireTenant(user), dto.planId);
  }

  @Get('current')
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getCurrent(this.requireTenant(user));
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.subscriptionsService.cancel(this.requireTenant(user), id);
  }
}
