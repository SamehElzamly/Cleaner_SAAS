import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './entities/payment.entity.js';
import { Invoice, InvoiceSchema } from '../invoices/entities/invoice.entity.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsWebhookController } from './payments-webhook.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema }, // registered directly, no InvoicesModule import
    ]),
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
