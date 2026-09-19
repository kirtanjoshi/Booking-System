import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { runtimeDataSourceOptions } from './data-source/runtime.datasource';
import { AuthenticationModule } from './authentication/authentication.module';
import { AvailabilityModule } from './availability/availability.module';
import { SessionTypeModule } from './session-type/session-type.module';
import { ClientModule } from './client/client.module';
import { BookingModule } from './booking/booking.module';
import { AdminModule } from './admin/admin.module';
import { MessageLogModule } from './message-log/message-log.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(runtimeDataSourceOptions),
    AuthenticationModule,
    AvailabilityModule,
    SessionTypeModule,
    ClientModule,
    BookingModule,
    AdminModule,
    MessageLogModule,
    WhatsAppModule,
    UserModule,
  ],
})
export class AppModule {}
