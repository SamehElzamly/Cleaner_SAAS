import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from './entities/invoice.entity.js';
import { Counter, CounterDocument } from './entities/counter.entity.js';
import { Booking, BookingDocument } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { Customer, CustomerDocument } from '../customers/entities/customer.entity.js';
import { CleaningService, CleaningServiceDocument } from '../services/entities/cleaning-service.entity.js';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { VoidInvoiceDto } from './dto/void-invoice.dto.js';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';
import { fromCents, toCents } from '../common/utils/money.js';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(CleaningService.name) private readonly serviceModel: Model<CleaningServiceDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly pdfService: InvoicePdfService,
  ) {}

  // Atomic per-tenant sequence -> INV-000001, INV-000002, ...
  private async nextInvoiceNumber(tenantId: string): Promise<string> {
    const counter = await this.counterModel
      .findOneAndUpdate(
        { key: `invoice:${tenantId}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      )
      .exec();
    return `INV-${String(counter.seq).padStart(6, '0')}`;
  }

  async create(tenantId: string, createdBy: string, dto: CreateInvoiceDto) {
    const booking = await this.bookingModel.findOne({ _id: dto.bookingId, tenantId }).exec();
    if (!booking) throw new BadRequestException('bookingId does not belong to this tenant');

    // Invoices come from finished work, so the amount can never be for a job
    // that was canceled or hasn't happened. (Relax this if you invoice upfront.)
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Only completed bookings can be invoiced');
    }

    if (await this.invoiceModel.exists({ tenantId, bookingId: dto.bookingId })) {
      throw new ConflictException('This booking already has an invoice');
    }

    const [customer, service, tenant] = await Promise.all([
      this.customerModel.findOne({ _id: booking.customerId, tenantId }).exec(),
      this.serviceModel.findOne({ _id: booking.serviceId, tenantId }).exec(),
      this.tenantModel.findById(tenantId).exec(),
    ]);
    if (!customer || !tenant) throw new NotFoundException('Customer or tenant no longer exists');

    // The amount comes from the booking's own price snapshot — never from
    // the request body.
    const taxRate = dto.taxRate ?? 0;
    const subtotalCents = toCents(booking.totalPrice);
    const taxCents = Math.round((subtotalCents * taxRate) / 100);
    const totalCents = subtotalCents + taxCents;

    const invoiceNumber = await this.nextInvoiceNumber(tenantId);

    try {
      const saved = await new this.invoiceModel({
        tenantId,
        bookingId: booking._id,
        customerId: customer._id,
        invoiceNumber,
        currency: tenant.currency || 'USD',
        lineItems: [
          {
            description: service?.name ?? 'Cleaning service',
            quantity: booking.quantity,
            unitPrice: booking.unitPrice,
            total: booking.totalPrice,
          },
        ],
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: booking.address ?? customer.address,
        },
        subtotal: fromCents(subtotalCents),
        taxRate,
        taxAmount: fromCents(taxCents),
        total: fromCents(totalCents),
        issuedAt: new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        createdBy,
      }).save();
      return saved;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('This booking already has an invoice');
      }
      throw err;
    }
  }

  async findAll(tenantId: string, q: ListInvoicesQueryDto) {
    const p = normalizePagination(q.page, q.limit);
    const filter: Record<string, any> = { tenantId };
    if (q.status) filter.status = q.status;
    if (q.customerId) filter.customerId = q.customerId;
    if (q.from || q.to) {
      filter.issuedAt = {};
      if (q.from) filter.issuedAt.$gte = new Date(q.from);
      if (q.to) filter.issuedAt.$lt = new Date(q.to);
    }
    const [invoices, total] = await Promise.all([
      this.invoiceModel.find(filter).sort({ issuedAt: -1 }).skip(p.skip).limit(p.limit).exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);
    return { invoices, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.invoiceModel.findOne({ _id: id, tenantId }).exec();
    if (!invoice) throw new NotFoundException(`Invoice with id "${id}" not found`);
    return invoice;
  }

  async voidInvoice(tenantId: string, id: string, dto: VoidInvoiceDto) {
    const invoice = await this.findOne(tenantId, id);
    // Voiding an invoice that has money against it would silently orphan the
    // payments. Refunds aren't built yet, so only untouched invoices can be voided.
    if (invoice.status !== InvoiceStatus.ISSUED || invoice.amountPaid > 0) {
      throw new BadRequestException('Only issued invoices with no payments can be voided');
    }

    // Compare-and-set: succeeds only if it's STILL issued and unpaid, so a
    // payment landing at the same moment can't be voided out from under.
    const updated = await this.invoiceModel
      .findOneAndUpdate(
        { _id: id, tenantId, status: InvoiceStatus.ISSUED, amountPaid: 0 },
        { $set: { status: InvoiceStatus.VOID, voidedAt: new Date(), voidReason: dto.reason } },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException('A payment was just recorded on this invoice — it can no longer be voided');
    }
    return updated;
  }

  async renderPdf(tenantId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);
    const tenant = await this.tenantModel.findById(tenantId).select('name').lean().exec();
    const buffer = await this.pdfService.render(invoice, tenant?.name ?? '');
    return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
  }
}
