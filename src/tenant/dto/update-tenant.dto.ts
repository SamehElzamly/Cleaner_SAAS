import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto.js';
import { TenantStatus } from '../enums/tenant-status.enum.js';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
    @IsOptional()
    @IsEnum(TenantStatus, {
        message: `status must be one of: ${Object.values(TenantStatus).join(', ')}`,
    })
    status?: TenantStatus;
}