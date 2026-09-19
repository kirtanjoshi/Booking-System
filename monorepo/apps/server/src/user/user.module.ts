import { Module } from '@nestjs/common';
import { UserPortalController } from './user-portal.controller';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  controllers: [UserPortalController],
})
export class UserModule {}
