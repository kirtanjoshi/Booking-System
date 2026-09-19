import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionTypeService } from './session-type.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import {
  CreateSessionTypeDto,
  UpdateSessionTypeDto,
} from './dto/create-session-type.dto';

@Controller('session-types')
export class SessionTypeController {
  constructor(private readonly sessionTypeService: SessionTypeService) {}

  @Get()
  async getAll(@Req() req: Request) {
    const adminId = (req as any).session?.adminId;
    return this.sessionTypeService.getAll(adminId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.sessionTypeService.getById(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  async create(
    @Req() req: Request,
    @Body() dto: CreateSessionTypeDto,
  ) {
    const adminId = (req as any).session?.adminId;
    return this.sessionTypeService.create(adminId, dto);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionTypeDto,
  ) {
    return this.sessionTypeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async delete(@Param('id') id: string) {
    return this.sessionTypeService.delete(id);
  }
}
