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

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Unauthenticated / server-to-server & admin UI booking creation
  @Post()
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(dto);
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
  ) {
    return this.bookingService.updateNotes(id, notes || '');
  }

  @Post(':id/images')
  async addImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.bookingService.addImage(id, imageUrl);
  }
}
