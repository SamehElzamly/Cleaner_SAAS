import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from './entities/branch.entity.js';
import { Staff, StaffSchema } from '../staff/entities/staff.entity.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { BranchesService } from './branches.service.js';
import { BranchesController } from './branches.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Staff.name, schema: StaffSchema }, // only for the "branch still has staff" check
    ]),
    SubscriptionsModule, // maxBranches enforcement
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
