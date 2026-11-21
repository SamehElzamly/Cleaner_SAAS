import { IsMongoId, Matches } from 'class-validator';

export class CalendarQueryDto {
  @IsMongoId({ message: 'branchId must be a valid id' })
  branchId: string;

  // A calendar day in the TENANT's timezone, e.g. "2026-11-02".
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
}
