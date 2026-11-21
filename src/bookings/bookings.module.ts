import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './entities/booking.entity.js';
import { Customer, CustomerSchema } from '../customers/entities/customer.entity.js';
import { CleaningService, CleaningServiceSchema } from '../services/entities/cleaning-service.entity.js';
import { Branch, BranchSchema } from '../branches/entities/branch.entity.js';
import { Staff, StaffSchema } from '../staff/entities/staff.entity.js';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity.js';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { CalendarController } from './calendar.controller.js';

@Module({
  imports: [
    // The other models are registered directly (schemas only) instead of
    // importing their modules — those modules need the Booking schema too
    // (for their "can't delete, has bookings" checks), and importing each
    // other would create circular module dependencies.
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: CleaningService.name, schema: CleaningServiceSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Staff.name, schema: StaffSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [BookingsController, CalendarController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
