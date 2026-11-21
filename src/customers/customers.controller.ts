import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { requireTenant } from '../common/utils/require-tenant.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { UserRole } from '../auth/entities/user.entity.js';

// Employees take calls and book jobs, so they can create/read/update
// customers. Deleting is COMPANY only.
//
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY, UserRole.EMPLOYEE)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(requireTenant(user), dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(requireTenant(user), page, limit, search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.customersService.findOne(requireTenant(user), id);
  }

  // GET /customers/:id/bookings?page=1&limit=10
  @Get(':id/bookings')
  findBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.customersService.findBookings(requireTenant(user), id, page, limit);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(requireTenant(user), id, dto);
  }

  @Roles(UserRole.COMPANY)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.customersService.remove(requireTenant(user), id);
  }
}
