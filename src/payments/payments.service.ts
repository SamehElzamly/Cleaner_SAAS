import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument, PaymentMethod, PaymentSource, PaymentStatus } from './entities/payment.entity.js';
import { Invoice, InvoiceDocument, InvoiceStatus } from '../invoices/entities/invoice.entity.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { WebhookEventDto } from './dto/webhook-event.dto.js';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';
import { fromCents, toCents } from '../common/utils/money.js';

type Failure = 'not_payable' | 'exceeds_balance' | 'concurrent_update' | 'invoice_missing' | 'currency_mismatch';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  // ---------------------------------------------------------------- core

  private checkApplicable(invoice: InvoiceDocument, amount: number): 'not_payable' | 'exceeds_balance' | null {
    if (invoice.status !== InvoiceStatus.ISSUED && invoice.status !== InvoiceStatus.PARTIALLY_PAID) {
      return 'not_payable';
    }
    const remaining = toCents(invoice.total) - toCents(invoice.amountPaid);
    return toCents(amount) > remaining ? 'exceeds_balance' : null;
  }

  // Adds `amount` to the invoice's amountPaid and moves its status. The
  // update only applies if amountPaid is STILL what we read (compare-and-set),
  // so two payments landing at once can't both pass the balance check and
  // overpay; the loser re-reads and re-checks, up to 3 times.
  private async applyToInvoice(
    tenantId: string,
    invoiceId: string,
    amount: number,
  ): Promise<{ ok: true } | { ok: false; reason: Failure }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const invoice = await this.invoiceModel.findOne({ _id: invoiceId, tenantId }).exec();
      if (!invoice) return { ok: false, reason: 'invoice_missing' };

      const reason = this.checkApplicable(invoice, amount);
      if (reason) return { ok: false, reason };

      const paidCents = toCents(invoice.amountPaid) + toCents(amount);
      const isPaid = paidCents >= toCents(invoice.total);

      const updated = await this.invoiceModel
        .findOneAndUpdate(
          {
            _id: invoice._id,
            tenantId,
            amountPaid: invoice.amountPaid,
            status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
          },
          {
            $set: {
              amountPaid: fromCents(paidCents),
              status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
              ...(isPaid ? { paidAt: new Date() } : {}),
            },
          },
        )
        .exec();
      if (updated) return { ok: true };
    }
    return { ok: false, reason: 'concurrent_update' };
  }

  private toException(reason: Failure, invoice?: InvoiceDocument) {
    switch (reason) {
      case 'not_payable':
        return new BadRequestException(`This invoice is ${invoice?.status ?? 'not payable'} and can't take payments`);
      case 'exceeds_balance': {
        const remaining = invoice ? fromCents(toCents(invoice.total) - toCents(invoice.amountPaid)) : 0;
        return new BadRequestException(`Amount exceeds the remaining balance (${remaining} ${invoice?.currency ?? ''})`.trim());
      }
      case 'concurrent_update':
        return new ConflictException('The invoice was just updated by someone else — please retry');
      default:
        return new NotFoundException('Invoice not found');
    }
  }

  // ------------------------------------------------------- manual payments

  // Staff recording money received in person / by transfer.
  async recordPayment(tenantId: string, userId: string, dto: CreatePaymentDto) {
    const invoice = await this.invoiceModel.findOne({ _id: dto.invoiceId, tenantId }).exec();
    if (!invoice) throw new BadRequestException('invoiceId does not belong to this tenant');

    const pre = this.checkApplicable(invoice, dto.amount);
    if (pre) throw this.toException(pre, invoice);

    // Payment row first (pending), invoice second, then confirm. Without
    // transactions a crash between the steps leaves a visible "pending"
    // payment to reconcile — never an invoice marked paid with no record.
    const payment = await new this.paymentModel({
      tenantId,
      invoiceId: invoice._id,
      amount: dto.amount,
      currency: invoice.currency,
      method: dto.method,
      status: PaymentStatus.PENDING,
      source: PaymentSource.MANUAL,
      note: dto.note,
      recordedBy: userId,
    }).save();

    const result = await this.applyToInvoice(tenantId, dto.invoiceId, dto.amount);
    if (!result.ok) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = result.reason;
      await payment.save();
      throw this.toException(result.reason, invoice);
    }

    payment.status = PaymentStatus.SUCCEEDED;
    payment.paidAt = new Date();
    return payment.save();
  }

  // -------------------------------------------------------------- webhook

  // Called by the (signature-verified) gateway webhook. Always answers 2xx
  // for events it has understood — even ones it couldn't apply — so the
  // gateway doesn't retry forever; unapplied money is parked as REVIEW.
  async handleWebhook(evt: WebhookEventDto) {
    const provider = evt.provider ?? 'gateway';

    const invoice = await this.invoiceModel.findById(evt.invoiceId).exec();
    if (!invoice) {
      this.logger.warn(`Webhook ${evt.eventId}: invoice ${evt.invoiceId} not found — nothing recorded`);
      return { received: true, applied: false, reason: 'invoice_not_found' };
    }

    // Inserting first IS the idempotency lock: the unique (provider,
    // providerReference) index makes a redelivered event fail right here.
    let payment: PaymentDocument;
    try {
      payment = await new this.paymentModel({
        tenantId: invoice.tenantId,
        invoiceId: invoice._id,
        amount: evt.amount,
        currency: (evt.currency ?? invoice.currency).toUpperCase(),
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
        source: PaymentSource.WEBHOOK,
        provider,
        providerReference: evt.eventId,
      }).save();
    } catch (err: any) {
      if (err?.code === 11000) return { received: true, duplicate: true };
      throw err;
    }

    if (evt.type === 'payment.failed') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = evt.failureReason ?? 'reported failed by gateway';
      await payment.save();
      return { received: true, applied: false };
    }

    if (payment.currency !== invoice.currency) {
      return this.parkForReview(payment, 'currency_mismatch');
    }

    const result = await this.applyToInvoice(invoice.tenantId.toString(), evt.invoiceId, evt.amount);
    if (!result.ok) return this.parkForReview(payment, result.reason);

    payment.status = PaymentStatus.SUCCEEDED;
    payment.paidAt = new Date();
    await payment.save();
    return { received: true, applied: true };
  }

  private async parkForReview(payment: PaymentDocument, reason: Failure) {
    payment.status = PaymentStatus.REVIEW;
    payment.failureReason = reason;
    await payment.save();
    this.logger.warn(`Payment ${payment._id} parked for review: ${reason}`);
    return { received: true, applied: false, reason };
  }

  // ----------------------------------------------------------------- reads

  async findAll(tenantId: string, q: ListPaymentsQueryDto) {
    const p = normalizePagination(q.page, q.limit);
    const filter: Record<string, any> = { tenantId };
    if (q.invoiceId) filter.invoiceId = q.invoiceId;
    if (q.status) filter.status = q.status;
    const [payments, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);
    return { payments, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const payment = await this.paymentModel.findOne({ _id: id, tenantId }).exec();
    if (!payment) throw new NotFoundException(`Payment with id "${id}" not found`);
    return payment;
  }
}
