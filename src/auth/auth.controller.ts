import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import {  CreateUserDto } from './dto/user-auth.dto.js';
import { UpdateAuthDto } from './dto/updateuser-auth.dto.js';
import { User } from './entities/user.entity.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return await this.authService.login(body.email, body.password);
  }
  @Post('signup')
  async create(@Body() User: CreateUserDto) {
    return await this.authService.create(User);
  }

}
