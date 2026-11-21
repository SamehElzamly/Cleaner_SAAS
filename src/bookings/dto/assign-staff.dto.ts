import { IsMongoId } from 'class-validator';

export class AssignStaffDto {
  @IsMongoId({ message: 'staffId must be a valid id' })
  staffId: string;
}
