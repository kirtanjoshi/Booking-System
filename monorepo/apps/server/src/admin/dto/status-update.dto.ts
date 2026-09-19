import { IsNotEmpty, IsString } from 'class-validator';

export class StatusUpdateDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
