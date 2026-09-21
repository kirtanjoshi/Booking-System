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
  @UseGuards(AdminAuthGuard)
  async getProfile(@Param('id') id: string) {
    return this.adminService.getAdminProfile(id);
  }

  @Get(':id/public')
  async getPublicProfile(@Param('id') id: string) {
    return this.adminService.getPublicPractitionerProfile(id);
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
