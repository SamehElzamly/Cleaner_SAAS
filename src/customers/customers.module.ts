import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './entities/customer.entity.js';
import { Booking, BookingSchema } from '../bookings/entities/booking.entity.js';
import { CustomersService } from './customers.service.js';
import { CustomersController } from './customers.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Booking.name, schema: BookingSchema }, // history + delete guard
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
