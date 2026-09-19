import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageLogService } from './message-log.service';
import { MessageLog } from './entities/message-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageLog])],
  providers: [MessageLogService],
  exports: [MessageLogService],
})
export class MessageLogModule {}
