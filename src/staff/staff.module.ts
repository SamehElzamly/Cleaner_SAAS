import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Staff, StaffSchema } from './entities/staff.entity.js';
import { Branch, BranchSchema } from '../branches/entities/branch.entity.js';
import { User, UserSchema } from '../auth/entities/user.entity.js';
import { StaffService } from './staff.service.js';
import { StaffController } from './staff.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      // Registered here (not via module imports) just to verify that a
      // branchId/userId in a request belongs to the caller's tenant.
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
