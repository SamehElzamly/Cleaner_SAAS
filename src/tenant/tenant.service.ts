import { Injectable,NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './entities/tenant.entity.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';

@Injectable()
export class TenantService {

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel:Model <TenantDocument>
  ) {}

  create(createTenantDto: CreateTenantDto) {
    const created = new this.tenantModel(createTenantDto);
    return created.save()
  }

  findAll() {
    return { message: 'This action returns all tenant' };
  }

  findOne(id: number) {
    return { message: `This action returns a #${id} tenant` };
  }

  update(id: number, updateTenantDto: UpdateTenantDto) {
    return { message: `This action updates a #${id} tenant` };
  }

  remove(id: number) {
    return { message: `This action removes a #${id} tenant` };
  }
}
