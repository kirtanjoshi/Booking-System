import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionTypeService } from './session-type.service';
import { SessionTypeController } from './session-type.controller';
import { SessionType } from './entities/session-type.entity';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SessionType, Admin])],
  providers: [SessionTypeService],
  controllers: [SessionTypeController],
  exports: [SessionTypeService],
})
export class SessionTypeModule {}
