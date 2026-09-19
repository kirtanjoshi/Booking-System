import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday

  @IsString()
  @IsNotEmpty()
  startTime: string; // "10:00"

  @IsString()
  @IsNotEmpty()
  endTime: string; // "13:00"

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
