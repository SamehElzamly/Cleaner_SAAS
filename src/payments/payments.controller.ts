import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { requireTenant } from '../common/utils/require-tenant.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { UserRole } from '../auth/entities/user.entity.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY, UserRole.EMPLOYEE)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Record a cash / card / bank-transfer payment received by staff.
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.recordPayment(requireTenant(user), user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.findAll(requireTenant(user), query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.paymentsService.findOne(requireTenant(user), id);
  }
}
