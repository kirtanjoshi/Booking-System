import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingService } from '../booking/booking.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('user')
export class UserPortalController {
  constructor(private readonly bookingService: BookingService) {}

  private getSessionPhone(req: Request): string {
    const session = (req as any).session;
    const phone = session?.phoneNumber;
    if (!phone) {
      throw new UnauthorizedException('Authentication required');
    }
    return phone;
  }

  @Get('bookings/upcoming')
  async getUpcoming(@Req() req: Request) {
    const phone = this.getSessionPhone(req);
    return this.bookingService.getUserUpcomingBookings(phone);
  }

  @Get('bookings/history')
  async getHistory(@Req() req: Request) {
    const phone = this.getSessionPhone(req);
    return this.bookingService.getUserBookingHistory(phone);
  }

  @Get('booked-dates')
  async getBookedDates(@Req() req: Request) {
    const phone = this.getSessionPhone(req);
    const upcoming = await this.bookingService.getUserUpcomingBookings(phone);
    const dates = upcoming.map((b) => b.scheduledStart.toISOString().split('T')[0]);
    return Array.from(new Set(dates));
  }
}
