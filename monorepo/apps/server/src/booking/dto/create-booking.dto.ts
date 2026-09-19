import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingSource } from '../../common/enums';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  adminId: string;

  @IsString()
  @IsNotEmpty()
  sessionTypeId: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledStart: string; // ISO 8601

  @IsEnum(BookingSource)
  source: BookingSource;

  // Client info (can provide existing clientId or phone/name/birth details for new/upsert)
  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientPhoneNumber?: string;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  birthTime?: string;

  @IsString()
  @IsOptional()
  birthPlace?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
