import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './entities/tenant.entity.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';

@Injectable()
export class TenantService {

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>
  ) { }

  create(createTenantDto: CreateTenantDto) {
    const created = new this.tenantModel(createTenantDto);
    return created.save()
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
      this.tenantModel.find().skip(skip).limit(limit).exec(),
      this.tenantModel.countDocuments().exec(),
    ])

    return {
      tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  findOne(id: string) {
    
    return this.tenantModel.findById(id);
  }

  update(id: string, data: UpdateTenantDto) {
    const updateData : Partial <UpdateTenantDto> = {};
    if(data.name !== undefined){
      updateData.name = data.name;
    }
    if(data.slug !== undefined){
      updateData.slug = data.slug;
    }
    if(data.status !== undefined){
      updateData.status = data.status;
    }

    return this.tenantModel.updateOne({_id:id},
      {$set:updateData},
    ).exec()
  }

  remove(id: string) {
    return this.tenantModel.deleteOne({_id:id})
  }
}
