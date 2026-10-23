import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './entities/plan.entity.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';

@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>) {}

  async create(dto: CreatePlanDto) {
    try {
      return await new this.planModel(dto).save();
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A plan named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  // Regular users only ever see plans they can actually subscribe to;
  // platform admins also see retired (inactive) ones.
  findAll(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return this.planModel.find(filter).sort({ price: 1 }).exec();
  }

  async findOne(id: string) {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException(`Plan with id "${id}" not found`);
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    try {
      const updated = await this.planModel
        .findByIdAndUpdate(id, { $set: dto }, { new: true })
        .exec();
      if (!updated) throw new NotFoundException(`Plan with id "${id}" not found`);
      return updated;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(`A plan named "${dto.name}" already exists`);
      }
      throw err;
    }
  }
}
