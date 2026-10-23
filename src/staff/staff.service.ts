import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Staff, StaffDocument } from './entities/staff.entity.js';
import { Branch, BranchDocument } from '../branches/entities/branch.entity.js';
import { User, UserDocument } from '../auth/entities/user.entity.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { AvailabilitySlotDto } from './dto/availability-slot.dto.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // The ids in the body are client-supplied, so confirm they belong to the
  // SAME tenant — otherwise one tenant could attach another tenant's user
  // or branch to its own staff record.
  private async assertBranchInTenant(tenantId: string, branchId: string) {
    const ok = await this.branchModel.exists({ _id: branchId, tenantId });
    if (!ok) throw new BadRequestException('branchId does not belong to this tenant');
  }

  private async assertUserInTenant(tenantId: string, userId: string) {
    const ok = await this.userModel.exists({ _id: userId, tenantId });
    if (!ok) throw new BadRequestException('userId does not belong to this tenant');
  }

  private validateAvailability(slots: AvailabilitySlotDto[] = []) {
    for (const s of slots) {
      // "HH:mm" strings compare correctly as plain strings.
      if (s.startTime >= s.endTime) {
        throw new BadRequestException(
          `Invalid slot on day ${s.dayOfWeek}: startTime must be before endTime`,
        );
      }
    }
    const byDay = new Map<number, AvailabilitySlotDto[]>();
    for (const s of slots) byDay.set(s.dayOfWeek, [...(byDay.get(s.dayOfWeek) ?? []), s]);
    for (const [day, list] of byDay) {
      const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          throw new BadRequestException(`Overlapping availability slots on day ${day}`);
        }
      }
    }
  }

  async create(tenantId: string, dto: CreateStaffDto) {
    this.validateAvailability(dto.availability);
    await this.assertBranchInTenant(tenantId, dto.branchId);
    await this.assertUserInTenant(tenantId, dto.userId);

    try {
      return await new this.staffModel({ ...dto, tenantId }).save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('This user already has a staff profile');
      }
      throw err;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10) {
    const p = normalizePagination(page, limit);
    const [staff, total] = await Promise.all([
      this.staffModel
        .find({ tenantId })
        .skip(p.skip)
        .limit(p.limit)
        .populate('userId', 'fullName email phone jobTitle')
        .populate('branchId', 'name')
        .exec(),
      this.staffModel.countDocuments({ tenantId }).exec(),
    ]);
    return { staff, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const staff = await this.staffModel
      .findOne({ _id: id, tenantId })
      .populate('userId', 'fullName email phone jobTitle')
      .populate('branchId', 'name')
      .exec();
    if (!staff) throw new NotFoundException(`Staff member with id "${id}" not found`);
    return staff;
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    if (dto.branchId) await this.assertBranchInTenant(tenantId, dto.branchId);
    const updated = await this.staffModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Staff member with id "${id}" not found`);
    return updated;
  }

  async updateAvailability(tenantId: string, id: string, slots: AvailabilitySlotDto[]) {
    this.validateAvailability(slots);
    const updated = await this.staffModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: { availability: slots } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Staff member with id "${id}" not found`);
    return updated;
  }

  async remove(tenantId: string, id: string) {
    // Removes the staff PROFILE only — the underlying login account (User)
    // is untouched. TODO (Phase 4): block if they have upcoming bookings.
    const result = await this.staffModel.deleteOne({ _id: id, tenantId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Staff member with id "${id}" not found`);
    return { deleted: true, id };
  }
}
