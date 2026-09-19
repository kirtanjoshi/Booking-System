import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WhatsAppEmbeddedSignupCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  wabaId?: string;

  @IsString()
  @IsOptional()
  phoneNumberId?: string;
}
