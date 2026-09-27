import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './entities/tenant.entity.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { TenantStatus } from './enums/tenant-status.enum.js';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  // Mongo's duplicate-key error (code 11000) reports which field collided in
  // err.keyPattern; use that to give a precise message instead of guessing.
  private duplicateFieldMessage(err: any, fallbackValue?: string): string {
    const field = err?.keyPattern ? Object.keys(err.keyPattern)[0] : undefined;
    const value = field && err?.keyValue ? err.keyValue[field] : fallbackValue;
    return field
      ? `A tenant with ${field} "${value}" already exists`
      : 'A tenant with one of these unique fields already exists';
  }

  async create(createTenantDto: CreateTenantDto) {
    try {
      const created = new this.tenantModel({
        ...createTenantDto,
        status: TenantStatus.ACTIVE,
      });
      return await created.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(this.duplicateFieldMessage(err));
      }
      throw err;
    }
  }

  async findAll(page = 1, limit = 10) {
    // Query params arrive as strings unless a parsing pipe is used on the
    // controller side, and callers can still pass 0/negative/huge values —
    // clamp defensively here regardless of what the controller does.
    const safePage = Math.max(1, Math.trunc(Number(page)) || 1);
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit)) || 10));
    const skip = (safePage - 1) * safeLimit;

    const [tenants, total] = await Promise.all([
      this.tenantModel.find().skip(skip).limit(safeLimit).exec(),
      this.tenantModel.countDocuments().exec(),
    ]);

    return {
      tenants,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string) {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant with id "${id}" not found`);
    }
    return tenant;
  }

  async update(id: string, data: UpdateTenantDto) {
    try {
      const updated = await this.tenantModel
        .findByIdAndUpdate(id, { $set: data }, { new: true })
        .exec();

      if (!updated) {
        throw new NotFoundException(`Tenant with id "${id}" not found`);
      }
      return updated;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(this.duplicateFieldMessage(err));
      }
      throw err;
    }
  }

  async remove(id: string) {
    const result = await this.tenantModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Tenant with id "${id}" not found`);
    }
    return { deleted: true, id };
  }
}