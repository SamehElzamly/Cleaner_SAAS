import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { Tenant, TenantSchema } from './entities/tenant.entity.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Tenant.name,
        schema: TenantSchema,
      },
    ]),
    // Needed for TenantController's POST /tenant/:id/admin, which creates a
    // tenant's first COMPANY admin via UsersService.
    UsersModule,
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}