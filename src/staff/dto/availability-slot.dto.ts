import { IsInt, Matches, Max, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AvailabilitySlotDto {
  // 0 = Sunday ... 6 = Saturday
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(HHMM, { message: 'startTime must be 24h "HH:mm", e.g. "09:00"' })
  startTime: string;

  @Matches(HHMM, { message: 'endTime must be 24h "HH:mm", e.g. "17:30"' })
  endTime: string;
}
