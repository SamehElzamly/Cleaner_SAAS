import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './entities/branch.entity.js';
import { Staff, StaffDocument } from '../staff/entities/staff.entity.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(tenantId: string, dto: CreateBranchDto) {
    // Enforce the plan's maxBranches (the limit that was recorded in Phase 2
    // but had nothing to enforce it). No active subscription = unlimited,
    // same rule as maxUsers.
    const plan = await this.subscriptionsService.getActivePlan(tenantId);
    if (plan) {
      const count = await this.branchModel.countDocuments({ tenantId }).exec();
      if (count >= plan.maxBranches) {
        throw new ForbiddenException(
          `Your "${plan.name}" plan allows up to ${plan.maxBranches} branches — upgrade to add more`,
        );
      }
    }

    try {
      return await new this.branchModel({ ...dto, tenantId }).save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A branch named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10) {
    const p = normalizePagination(page, limit);
    const [branches, total] = await Promise.all([
      this.branchModel.find({ tenantId }).sort({ name: 1 }).skip(p.skip).limit(p.limit).exec(),
      this.branchModel.countDocuments({ tenantId }).exec(),
    ]);
    return { branches, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const branch = await this.branchModel.findOne({ _id: id, tenantId }).exec();
    if (!branch) throw new NotFoundException(`Branch with id "${id}" not found`);
    return branch;
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto) {
    try {
      const updated = await this.branchModel
        .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
        .exec();
      if (!updated) throw new NotFoundException(`Branch with id "${id}" not found`);
      return updated;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A branch named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async remove(tenantId: string, id: string) {
    // Don't orphan staff: they point at a branch that would no longer exist.
    const staffCount = await this.staffModel.countDocuments({ tenantId, branchId: id }).exec();
    if (staffCount > 0) {
      throw new ConflictException(
        `This branch still has ${staffCount} staff member(s) — reassign them before deleting it`,
      );
    }
    const result = await this.branchModel.deleteOne({ _id: id, tenantId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Branch with id "${id}" not found`);
    return { deleted: true, id };
  }
}
