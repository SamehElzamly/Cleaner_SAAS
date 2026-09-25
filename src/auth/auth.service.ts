import { Injectable } from '@nestjs/common';

import { UpdateAuthDto } from './dto/updateuser-auth.dto.js';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity.js';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/user-auth.dto.js';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) private readonly usermodel: Model<UserDocument>
  ) { }

  async login(email: string, password: string) {

    if (!email || !/^[^\s@]+@gmail\.com$/i.test(email)) {
      throw new BadRequestException('Invalid Gmail address');
    }

    if (!password || password.length < 6) {
      throw new BadRequestException('Invalid Password');
    }

    const user = await this.usermodel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user

  }

  async create(user: CreateUserDto) {
    user.password = await bcrypt.hash(user.password, process.env.SaltRound || 10);
    const create = new this.usermodel(user);
    return create.save()

  }


}
