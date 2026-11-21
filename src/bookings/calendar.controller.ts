import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { CalendarQueryDto } from './dto/calendar-query.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { requireTenant } from '../common/utils/require-tenant.js';
import { UserRole } from '../auth/entities/user.entity.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY, UserRole.EMPLOYEE)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly bookingsService: BookingsService) {}

  // GET /calendar?branchId=<id>&date=2026-11-02
  @Get()
  getDay(@CurrentUser() user: AuthenticatedUser, @Query() query: CalendarQueryDto) {
    return this.bookingsService.calendar(requireTenant(user), query.branchId, query.date);
  }
}
