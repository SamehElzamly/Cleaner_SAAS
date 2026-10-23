import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './entities/customer.entity.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { buildPagination, normalizePagination } from '../common/utils/pagination.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>) {}

  async create(tenantId: string, dto: CreateCustomerDto) {
    try {
      return await new this.customerModel({ ...dto, tenantId }).save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A customer with phone "${dto.phone}" already exists`);
      }
      throw err;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10, search?: string) {
    const p = normalizePagination(page, limit);
    const filter: Record<string, any> = { tenantId };
    if (search?.trim()) {
      // Escaped so user input is matched literally, never as a regex.
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }
    const [customers, total] = await Promise.all([
      this.customerModel.find(filter).sort({ name: 1 }).skip(p.skip).limit(p.limit).exec(),
      this.customerModel.countDocuments(filter).exec(),
    ]);
    return { customers, pagination: buildPagination(p.page, p.limit, total) };
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.customerModel.findOne({ _id: id, tenantId }).exec();
    if (!customer) throw new NotFoundException(`Customer with id "${id}" not found`);
    return customer;
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    try {
      const updated = await this.customerModel
        .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
        .exec();
      if (!updated) throw new NotFoundException(`Customer with id "${id}" not found`);
      return updated;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A customer with phone "${dto.phone}" already exists`);
      }
      throw err;
    }
  }

  async remove(tenantId: string, id: string) {
    // TODO (Phase 4): refuse to delete a customer who has bookings.
    const result = await this.customerModel.deleteOne({ _id: id, tenantId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Customer with id "${id}" not found`);
    return { deleted: true, id };
  }
}
