import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../auth/entities/user.entity.js';
import { TenantStatus } from './enums/tenant-status.enum.js';
import { UsersService } from '../users/users.service.js';
import { CreateTenantAdminDto } from '../users/dto/create-tenant-admin.dto.js';

// Restricted to platform-level ADMIN only — any authenticated user used to
// be able to create/list/update/delete ALL tenants (see the TODO that used
// to live here, before Roles/Permissions existed).
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.tenantService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  // Closes a gap left after Phase 1 landed: nothing could previously create
  // a tenant's first COMPANY admin. A platform ADMIN creates the Tenant
  // (POST /tenant), then calls this to provision its first admin, who can
  // then log in and use /users to build out the rest of their team.
  @Post(':id/admin')
  async createAdmin(@Param('id') id: string, @Body() dto: CreateTenantAdminDto) {
    const tenant = await this.tenantService.findOne(id); // throws 404 if missing
    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException('Cannot add an admin to a tenant that is not active');
    }
    return this.usersService.createTenantAdmin(id, dto);
  }
}