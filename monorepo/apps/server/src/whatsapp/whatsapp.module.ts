import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp.controller';
import { WhatsAppEmbeddedSignupController } from './whatsapp-embedded-signup.controller';
import { MessageLogModule } from '../message-log/message-log.module';
import { ClientModule } from '../client/client.module';
import { AvailabilityModule } from '../availability/availability.module';
import { SessionTypeModule } from '../session-type/session-type.module';
import { BookingModule } from '../booking/booking.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MessageLogModule,
    ClientModule,
    AvailabilityModule,
    SessionTypeModule,
    forwardRef(() => BookingModule),
    forwardRef(() => AdminModule),
  ],
  providers: [WhatsAppService],
  controllers: [WhatsAppWebhookController, WhatsAppEmbeddedSignupController],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
