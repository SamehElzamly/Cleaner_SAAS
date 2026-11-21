import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { Staff, StaffSchema } from '../staff/entities/staff.entity.js';
import { Booking, BookingSchema } from '../bookings/entities/booking.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Staff.name, schema: StaffSchema }, // cleanup on user delete
      { name: Booking.name, schema: BookingSchema }, // "has bookings" check
    ]),
    SubscriptionsModule, // plan limits (maxUsers) are enforced in UsersService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
