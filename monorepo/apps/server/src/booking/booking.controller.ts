import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingService } from './booking.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingSource } from '../common/enums';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Public customer booking (enforces WHATSAPP source, status will be PENDING)
  @Post()
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking({
      ...dto,
      source: BookingSource.WHATSAPP,
    });
  }

  // Admin-only direct booking creation (allows ADMIN source)
  @Post('admin')
  @UseGuards(AdminAuthGuard)
  async createAdminBooking(
    @Req() req: Request,
    @Body() dto: CreateBookingDto,
  ) {
    const adminId = (req as any).session?.adminId || dto.adminId;
    return this.bookingService.createBooking({
      ...dto,
      adminId,
      source: BookingSource.ADMIN,
    });
  }

  // Admin-only endpoints
  @Get()
  @UseGuards(AdminAuthGuard)
  async getAll(
    @Req() req: Request,
    @Query('date') date?: string,
    @Query('upcomingOnly') upcomingOnly?: string,
  ) {
    const adminId = (req as any).session?.adminId;
    return this.bookingService.getAll({
      adminId,
      date,
      upcomingOnly: upcomingOnly === 'true',
    });
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard)
  async getById(@Param('id') id: string) {
    return this.bookingService.getById(id);
  }

  @Patch(':id/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(id, dto);
  }

  @Patch(':id/notes')
  async updateNotes(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Req() req: Request,
  ) {
    const session = (req as any).session;
    return this.bookingService.updateNotes(id, notes || '', session);
  }

  @Post(':id/images')
  async addImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @Req() req: Request,
  ) {
    const session = (req as any).session;
    return this.bookingService.addImage(id, imageUrl, session);
  }
}
