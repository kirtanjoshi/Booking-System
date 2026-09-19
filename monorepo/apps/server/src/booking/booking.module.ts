import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Admin } from '../admin/entities/admin.entity';
import { SessionType } from '../session-type/entities/session-type.entity';
import { Client } from '../client/entities/client.entity';
import { MessageLogModule } from '../message-log/message-log.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Admin, SessionType, Client]),
    MessageLogModule,
    forwardRef(() => WhatsAppModule),
  ],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
