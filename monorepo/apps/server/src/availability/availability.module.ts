import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityRule } from './entities/availability-rule.entity';
import { DateOverride } from './entities/date-override.entity';
import { SessionType } from '../session-type/entities/session-type.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AvailabilityRule,
      DateOverride,
      SessionType,
      Booking,
      Admin,
    ]),
  ],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
