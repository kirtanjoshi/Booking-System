import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDateOverrideDto {
  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;
}

export class GetAvailabilityQueryDto {
  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  sessionTypeId: string;
}
