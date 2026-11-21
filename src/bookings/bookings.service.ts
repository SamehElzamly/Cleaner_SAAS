import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PopulateOptions } from 'mongoose';
import { Booking, BookingDocument } from './entities/booking.entity.js';
import { ACTIVE_BOOKING_STATUSES, ALLOWED_TRANSITIONS, BookingStatus } from './enums/booking-status.enum.js';
import { Customer, CustomerDocument } from '../customers/entities/customer.entity.js';
import { CleaningService, CleaningServiceDocument } from '../services/entities/cleaning-service.entity.js';
import { Branch, BranchDocument } from '../branches/entities/branch.entity.js';
import { Staff, StaffDocument } from '../staff/entities/staff.entity.js';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';
import { getZonedParts, toLocalHHmm, zonedDayRange } from '../common/utils/timezone.js';

const POPULATE: PopulateOptions[] = [
  { path: 'customerId', select: 'name phone' },
  { path: 'serviceId', select: 'name' },
  { path: 'branchId', select: 'name' },
  { path: 'staffId', select: 'userId', populate: { path: 'userId', select: 'fullName' } },
];

type Slot = { dayOfWeek: number; startTime: string; endTime: string };

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(CleaningService.name) private readonly serviceModel: Model<CleaningServiceDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  // ---------------------------------------------------------------- helpers

  private async getTimezone(tenantId: string): Promise<string> {
    const tenant = await this.tenantModel.findById(tenantId).select('timezone').lean().exec();
    return tenant?.timezone || 'UTC';
  }

  private assertFuture(date: Date) {
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }
  }

  // Does [start, end) sit entirely inside one of the staff member's weekly
  // slots, in the tenant's local time? No slots configured = unrestricted.
  private fitsAvailability(slots: Slot[] | undefined, start: Date, end: Date, tz: string) {
    if (!slots || slots.length === 0) return true;
    const s = getZonedParts(start, tz);
    const e = getZonedParts(end, tz);
    const sameDay = s.year === e.year && s.month === e.month && s.day === e.day;
    if (!sameDay) return false; // crossing local midnight never fits a daily slot
    const startStr = toLocalHHmm(start, tz);
    const endStr = toLocalHHmm(end, tz);
    return slots.some(
      (slot) => slot.dayOfWeek === s.dayOfWeek && slot.startTime <= startStr && slot.endTime >= endStr,
    );
  }

  // Everything that must hold for a staff member to take [start, end):
  // theirs, active, works at this branch, within their hours, and not
  // already booked. `excludeBookingId` lets a booking be re-checked against
  // itself when it is rescheduled or re-assigned.
  private async assertStaffCanTake(
    tenantId: string,
    staffId: string,
    branchId: string,
    start: Date,
    end: Date,
    excludeBookingId?: string,
  ) {
    const staff = await this.staffModel.findOne({ _id: staffId, tenantId }).exec();
    if (!staff) throw new BadRequestException('staffId does not belong to this tenant');
    if (!staff.isActive) throw new BadRequestException('This staff member is not active');
    if (staff.branchId.toString() !== branchId) {
      throw new BadRequestException('This staff member works at a different branch');
    }

    const tz = await this.getTimezone(tenantId);
    if (!this.fitsAvailability(staff.availability, start, end, tz)) {
      throw new BadRequestException(
        `Outside this staff member's working hours (times are in ${tz})`,
      );
    }

    const overlap = await this.bookingModel.exists({
      tenantId,
      staffId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      scheduledAt: { $lt: end },
      endsAt: { $gt: start },
      ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
    });
    if (overlap) {
      throw new ConflictException('This staff member already has a booking that overlaps this time');
    }
  }

  // ------------------------------------------------------------------- CRUD

  async create(tenantId: string, createdBy: string, dto: CreateBookingDto) {
    const start = new Date(dto.scheduledAt);
    this.assertFuture(start);
    const quantity = dto.quantity ?? 1;

    const [customer, service, branch] = await Promise.all([
      this.customerModel.findOne({ _id: dto.customerId, tenantId }).exec(),
      this.serviceModel.findOne({ _id: dto.serviceId, tenantId }).exec(),
      this.branchModel.findOne({ _id: dto.branchId, tenantId }).exec(),
    ]);
    if (!customer) throw new BadRequestException('customerId does not belong to this tenant');
    if (!service || !service.isActive) {
      throw new BadRequestException('serviceId is invalid or not currently available');
    }
    if (!branch || !branch.isActive) {
      throw new BadRequestException('branchId is invalid or not currently active');
    }

    const durationMinutes = service.durationMinutes * quantity;
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    if (dto.staffId) {
      await this.assertStaffCanTake(tenantId, dto.staffId, dto.branchId, start, end);
    }

    const booking = await new this.bookingModel({
      tenantId,
      customerId: dto.customerId,
      serviceId: dto.serviceId,
      branchId: dto.branchId,
      staffId: dto.staffId ?? null,
      scheduledAt: start,
      endsAt: end,
      durationMinutes,
      quantity,
      unitPrice: service.basePrice,
      totalPrice: Math.round(service.basePrice * quantity * 100) / 100,
      address: dto.address ?? customer.address,
      notes: dto.notes,
      createdBy,
    }).save();

    return this.findOne(tenantId, booking._id.toString());
  }

  async findAll(tenantId: string, q: ListBookingsQueryDto) {
    const p = normalizePagination(q.page, q.limit);
    const filter: Record<string, any> = { tenantId };
    if (q.status) filter.status = q.status;
    if (q.branchId) filter.branchId = q.branchId;
    if (q.staffId) filter.staffId = q.staffId;
    if (q.customerId) filter.customerId = q.customerId;
    if (q.from || q.to) {
      filter.scheduledAt = {};
      if (q.from) filter.scheduledAt.$gte = new Date(q.from);
      if (q.to) filter.scheduledAt.$lt = new Date(q.to);
    }

    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ scheduledAt: 1 })
        .skip(p.skip)
        .limit(p.limit)
        .populate(POPULATE)
        .exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);
    return { bookings, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const booking = await this.bookingModel
      .findOne({ _id: id, tenantId })
      .populate(POPULATE)
      .exec();
    if (!booking) throw new NotFoundException(`Booking with id "${id}" not found`);
    return booking;
  }

  // Raw (unpopulated) fetch for internal checks.
  private async load(tenantId: string, id: string) {
    const booking = await this.bookingModel.findOne({ _id: id, tenantId }).exec();
    if (!booking) throw new NotFoundException(`Booking with id "${id}" not found`);
    return booking;
  }

  private assertEditable(booking: BookingDocument) {
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`A ${booking.status} booking can no longer be changed`);
    }
  }

  async update(tenantId: string, id: string, dto: UpdateBookingDto) {
    const booking = await this.load(tenantId, id);
    this.assertEditable(booking);

    const $set: Record<string, any> = {};
    if (dto.address !== undefined) $set.address = dto.address;
    if (dto.notes !== undefined) $set.notes = dto.notes;

    if (dto.scheduledAt) {
      const start = new Date(dto.scheduledAt);
      this.assertFuture(start);
      const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
      if (booking.staffId) {
        await this.assertStaffCanTake(
          tenantId, booking.staffId.toString(), booking.branchId.toString(), start, end, id,
        );
      }
      $set.scheduledAt = start;
      $set.endsAt = end;
    }

    await this.bookingModel.updateOne({ _id: id, tenantId }, { $set }).exec();
    return this.findOne(tenantId, id);
  }

  async assignStaff(tenantId: string, id: string, staffId: string) {
    const booking = await this.load(tenantId, id);
    this.assertEditable(booking);

    await this.assertStaffCanTake(
      tenantId, staffId, booking.branchId.toString(), booking.scheduledAt, booking.endsAt, id,
    );
    await this.bookingModel.updateOne({ _id: id, tenantId }, { $set: { staffId } }).exec();
    return this.findOne(tenantId, id);
  }

  async changeStatus(tenantId: string, id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.load(tenantId, id);

    if (!ALLOWED_TRANSITIONS[booking.status].includes(dto.status)) {
      throw new BadRequestException(`Cannot change a booking from "${booking.status}" to "${dto.status}"`);
    }
    if (
      (dto.status === BookingStatus.CONFIRMED || dto.status === BookingStatus.IN_PROGRESS) &&
      !booking.staffId
    ) {
      throw new BadRequestException('Assign a staff member before confirming this booking');
    }

    const $set: Record<string, any> = { status: dto.status };
    if (dto.status === BookingStatus.CANCELED) {
      $set.canceledAt = new Date();
      if (dto.cancelReason) $set.cancelReason = dto.cancelReason;
    }
    if (dto.status === BookingStatus.COMPLETED) $set.completedAt = new Date();

    // Matching on the status we just read makes this a compare-and-set: if
    // someone else changed it in the meantime, nothing is written.
    const updated = await this.bookingModel
      .findOneAndUpdate({ _id: id, tenantId, status: booking.status }, { $set }, { new: true })
      .exec();
    if (!updated) throw new ConflictException('This booking was just changed by someone else — reload and retry');

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const booking = await this.load(tenantId, id);
    // Completed / in-progress / confirmed bookings are business records
    // (revenue, history). Cancel them instead of deleting.
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CANCELED) {
      throw new ConflictException(
        `A ${booking.status} booking can't be deleted — cancel it instead`,
      );
    }
    await this.bookingModel.deleteOne({ _id: id, tenantId }).exec();
    return { deleted: true, id };
  }

  // ---------------------------------------------------------------- calendar

  // All non-canceled bookings at a branch on one LOCAL calendar day of the
  // tenant (not a UTC day), ordered by start time.
  async calendar(tenantId: string, branchId: string, date: string) {
    const [y, m, d] = date.split('-').map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
      throw new BadRequestException(`"${date}" is not a real calendar date`);
    }

    const branch = await this.branchModel.exists({ _id: branchId, tenantId });
    if (!branch) throw new NotFoundException(`Branch with id "${branchId}" not found`);

    const timezone = await this.getTimezone(tenantId);
    const { start, end } = zonedDayRange(date, timezone);

    const bookings = await this.bookingModel
      .find({
        tenantId,
        branchId,
        status: { $ne: BookingStatus.CANCELED },
        scheduledAt: { $gte: start, $lt: end },
      })
      .sort({ scheduledAt: 1 })
      .populate(POPULATE)
      .exec();

    return { date, timezone, bookings };
  }
}
