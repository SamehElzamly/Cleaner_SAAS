import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './user-auth.dto.js';

export class UpdateAuthDto extends PartialType(CreateUserDto) {}
