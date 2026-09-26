import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) { }

  @UseGuards(JwtAccessGuard)
  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    
    return this.tenantService.create(createTenantDto);
  }

  @UseGuards(JwtAccessGuard)
  @Get()
  findAll(@Query('page') page:number, @Query('limit') limit:number) {
    return this.tenantService.findAll(page,limit);
  }

  @UseGuards(JwtAccessGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @UseGuards(JwtAccessGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @UseGuards(JwtAccessGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
