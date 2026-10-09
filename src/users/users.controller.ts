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
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../auth/entities/user.entity.js';

// Every route here manages users WITHIN the caller's own tenant only,
// restricted to COMPANY (a tenant's own admin). Platform-level ADMIN users
// have no tenantId of their own, so tenant-scoped user management doesn't
// apply to them — a future platform admin panel would need its own,
// separately-designed endpoints, not this controller.
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.COMPANY)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Defensive: RolesGuard already restricts this controller to COMPANY, and
  // the entity requires tenantId for every non-ADMIN role, so a COMPANY
  // user with no tenantId "shouldn't" be reachable here — but a JWT issued
  // before a future bug fix, a manually-edited DB row, etc. could still
  // produce one. Never silently filter by `tenantId: undefined`.
  private requireTenant(user: AuthenticatedUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException('No tenant associated with this account');
    }
    return user.tenantId;
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserByAdminDto) {
    return this.usersService.create(this.requireTenant(user), dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(this.requireTenant(user), page, limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.findOne(this.requireTenant(user), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(this.requireTenant(user), id, dto);
  }

  @Patch(':id/role')
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(this.requireTenant(user), id, dto, user.userId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(this.requireTenant(user), id, dto, user.userId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.remove(this.requireTenant(user), id, user.userId);
  }
}