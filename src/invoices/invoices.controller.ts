import {
  Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { VoidInvoiceDto } from './dto/void-invoice.dto.js';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { requireTenant } from '../common/utils/require-tenant.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { UserRole } from '../auth/entities/user.entity.js';

// COMPANY + EMPLOYEE issue and read invoices. Voiding is COMPANY only.
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY, UserRole.EMPLOYEE)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(requireTenant(user), user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.findAll(requireTenant(user), query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.invoicesService.findOne(requireTenant(user), id);
  }

  // GET /invoices/:id/pdf  -> downloads INV-000001.pdf
  @Get(':id/pdf')
  async pdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.invoicesService.renderPdf(requireTenant(user), id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  @Roles(UserRole.COMPANY)
  @Patch(':id/void')
  voidInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.invoicesService.voidInvoice(requireTenant(user), id, dto);
  }
}
