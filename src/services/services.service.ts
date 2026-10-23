import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CleaningService, CleaningServiceDocument } from './entities/cleaning-service.entity.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(CleaningService.name)
    private readonly serviceModel: Model<CleaningServiceDocument>,
  ) {}

  async create(tenantId: string, dto: CreateServiceDto) {
    try {
      return await new this.serviceModel({ ...dto, tenantId }).save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A service named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10) {
    const p = normalizePagination(page, limit);
    const [services, total] = await Promise.all([
      this.serviceModel.find({ tenantId }).sort({ name: 1 }).skip(p.skip).limit(p.limit).exec(),
      this.serviceModel.countDocuments({ tenantId }).exec(),
    ]);
    return { services, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.serviceModel.findOne({ _id: id, tenantId }).exec();
    if (!service) throw new NotFoundException(`Service with id "${id}" not found`);
    return service;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    try {
      const updated = await this.serviceModel
        .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
        .exec();
      if (!updated) throw new NotFoundException(`Service with id "${id}" not found`);
      return updated;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A service named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  // Quote for N units of a service (basePrice x quantity). Kept deliberately
  // simple — no tiers/discounts/tax yet; Bookings (Phase 4) will reuse it.
  async getPrice(tenantId: string, id: string, quantity = 1) {
    const service = await this.findOne(tenantId, id);
    if (!service.isActive) {
      throw new BadRequestException('This service is not currently available');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('quantity must be a whole number >= 1');
    }
    return {
      serviceId: service._id,
      name: service.name,
      basePrice: service.basePrice,
      quantity,
      total: Math.round(service.basePrice * quantity * 100) / 100,
      durationMinutes: service.durationMinutes,
    };
  }

  async remove(tenantId: string, id: string) {
    // TODO (Phase 4): refuse to delete a service that existing bookings
    // reference — deactivate it (isActive: false) instead.
    const result = await this.serviceModel.deleteOne({ _id: id, tenantId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Service with id "${id}" not found`);
    return { deleted: true, id };
  }
}
