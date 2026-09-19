import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import {
  CreateAvailabilityRuleDto,
  UpdateAvailabilityRuleDto,
} from './dto/create-availability-rule.dto';
import { CreateDateOverrideDto } from './dto/create-date-override.dto';

@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Public endpoint for slot availability
  @Get('admins/:id/availability')
  async getAvailability(
    @Param('id') adminId: string,
    @Query('date') date: string,
    @Query('sessionTypeId') sessionTypeId: string,
  ) {
    return this.availabilityService.getAvailability(adminId, date, sessionTypeId);
  }

  // Admin-only CRUD for AvailabilityRule
  @Get('availability-rules')
  @UseGuards(AdminAuthGuard)
  async getAllRules(@Req() req: Request) {
    const adminId = (req as any).session?.adminId;
    return this.availabilityService.getAllRules(adminId);
  }

  @Post('availability-rules')
  @UseGuards(AdminAuthGuard)
  async createRule(
    @Req() req: Request,
    @Body() dto: CreateAvailabilityRuleDto,
  ) {
    const adminId = (req as any).session?.adminId;
    return this.availabilityService.createRule(adminId, dto);
  }

  @Patch('availability-rules/:id')
  @UseGuards(AdminAuthGuard)
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityRuleDto,
  ) {
    return this.availabilityService.updateRule(id, dto);
  }

  @Delete('availability-rules/:id')
  @UseGuards(AdminAuthGuard)
  async deleteRule(@Param('id') id: string) {
    return this.availabilityService.deleteRule(id);
  }

  // Admin-only CRUD for DateOverride
  @Get('date-overrides')
  @UseGuards(AdminAuthGuard)
  async getAllOverrides(@Req() req: Request) {
    const adminId = (req as any).session?.adminId;
    return this.availabilityService.getAllOverrides(adminId);
  }

  @Post('date-overrides')
  @UseGuards(AdminAuthGuard)
  async createOverride(
    @Req() req: Request,
    @Body() dto: CreateDateOverrideDto,
  ) {
    const adminId = (req as any).session?.adminId;
    return this.availabilityService.createOverride(adminId, dto);
  }

  @Delete('date-overrides/:id')
  @UseGuards(AdminAuthGuard)
  async deleteOverride(@Param('id') id: string) {
    return this.availabilityService.deleteOverride(id);
  }
}
