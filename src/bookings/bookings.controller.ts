import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { AssignStaffDto } from './dto/assign-staff.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { requireTenant } from '../common/utils/require-tenant.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { UserRole } from '../auth/entities/user.entity.js';

// COMPANY + EMPLOYEE run the day-to-day (create, reschedule, assign, move
// through statuses). Deleting is COMPANY only.
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY, UserRole.EMPLOYEE)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(requireTenant(user), user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListBookingsQueryDto) {
    return this.bookingsService.findAll(requireTenant(user), query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.bookingsService.findOne(requireTenant(user), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(requireTenant(user), id, dto);
  }

  @Patch(':id/assign-staff')
  assignStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AssignStaffDto,
  ) {
    return this.bookingsService.assignStaff(requireTenant(user), id, dto.staffId);
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.changeStatus(requireTenant(user), id, dto);
  }

  @Roles(UserRole.COMPANY)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.bookingsService.remove(requireTenant(user), id);
  }
}
