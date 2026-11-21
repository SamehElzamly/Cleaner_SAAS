import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './entities/invoice.entity.js';
import { Counter, CounterSchema } from './entities/counter.entity.js';
import { Booking, BookingSchema } from '../bookings/entities/booking.entity.js';
import { Customer, CustomerSchema } from '../customers/entities/customer.entity.js';
import { CleaningService, CleaningServiceSchema } from '../services/entities/cleaning-service.entity.js';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { InvoicesController } from './invoices.controller.js';

@Module({
  imports: [
    // Other modules' models are registered directly (schemas only) so this
    // module doesn't import theirs — avoids circular module dependencies.
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: CleaningService.name, schema: CleaningServiceSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
