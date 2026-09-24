import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicesModule } from './services/services.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.DATABASECONNECTION || 'mongodb://localhost:27017/cleanerdb',
    ),
    ServicesModule,
    TenantModule,
    AuthModule,
  ],
})
export class AppModule {}
