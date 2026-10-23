import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicesModule } from './services/services.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PlansModule } from './plans/plans.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { StaffModule } from './staff/staff.module.js';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.DATABASECONNECTION || 'mongodb://localhost:27017/cleanerdb',
    ),
    ServicesModule,
    TenantModule,
    AuthModule,
    UsersModule,
    PlansModule,
    SubscriptionsModule,
    BranchesModule,
    CustomersModule,
    StaffModule,
  ],
})
export class AppModule {}
