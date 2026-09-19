import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateSessionTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  bufferMinutes?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSessionTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  durationMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  bufferMinutes?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
