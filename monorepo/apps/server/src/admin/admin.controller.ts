import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { StatusUpdateDto } from './dto/status-update.dto';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.adminService.getAdminProfile(id);
  }

  @Post(':id/status-update')
  @UseGuards(AdminAuthGuard)
  async sendStatusUpdate(
    @Param('id') id: string,
    @Body() dto: StatusUpdateDto,
  ) {
    return this.adminService.sendStatusUpdate(id, dto);
  }
}
