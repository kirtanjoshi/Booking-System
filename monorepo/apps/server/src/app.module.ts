import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120, // 120 requests per minute per IP
      },
    ]),
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
    RoleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
