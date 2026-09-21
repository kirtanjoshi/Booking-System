import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { Booking } from '../booking/entities/booking.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { BookingStatus } from '../common/enums';
import { StatusUpdateDto } from './dto/status-update.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
  ) {}

  async getAdminProfile(id: string): Promise<Omit<Admin, 'passwordHash' | 'whatsappAccessToken'>> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin with ID ${id} not found`);
    const { passwordHash, whatsappAccessToken, ...result } = admin;
    return result;
  }

  async getAdminCredentials(id: string): Promise<{
    whatsappPhoneNumberId?: string;
    whatsappAccessToken?: string;
    whatsappWabaId?: string;
  } | null> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) return null;
    return {
      whatsappPhoneNumberId: admin.whatsappPhoneNumberId,
      whatsappAccessToken: admin.whatsappAccessToken,
      whatsappWabaId: admin.whatsappWabaId,
    };
  }

  async getPublicPractitionerProfile(id: string) {
    const admin = await this.adminRepo.findOne({
      where: { id },
      select: ['id', 'name', 'businessName', 'timezone'],
    });
    if (!admin) throw new NotFoundException(`Admin with ID ${id} not found`);
    return admin;
  }

  async getDefaultAdmin(): Promise<Admin | null> {
    const admins = await this.adminRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return admins[0] || null;
  }

  async sendStatusUpdate(adminId: string, dto: StatusUpdateDto) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException(`Admin with ID ${adminId} not found`);

    const now = new Date();
    // End of today (UTC or local)
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Query for the next upcoming CONFIRMED booking today
    const nextBooking = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.sessionType', 'sessionType')
      .where('booking.admin_id = :adminId', { adminId })
      .andWhere('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('booking.scheduled_start >= :now AND booking.scheduled_start <= :endOfDay', {
        now,
        endOfDay,
      })
      .orderBy('booking.scheduled_start', 'ASC')
      .getOne();

    if (!nextBooking) {
      throw new NotFoundException(
        'No upcoming confirmed bookings found for today to send status update.',
      );
    }

    const sendResult = await this.whatsappService.sendStatusUpdate(
      nextBooking.client,
      nextBooking,
      dto.message,
    );

    return {
      message: 'Status update processed',
      recipient: {
        id: nextBooking.client.id,
        name: nextBooking.client.name || 'Client',
        phoneNumber: nextBooking.client.phoneNumber,
      },
      booking: {
        id: nextBooking.id,
        scheduledStart: nextBooking.scheduledStart,
        sessionType: nextBooking.sessionType.name,
      },
      delivery: sendResult,
    };
  }

  async updateWhatsAppCredentials(
    adminId: string,
    credentials: { phoneNumberId?: string; wabaId?: string; accessToken: string },
  ) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException(`Admin with ID ${adminId} not found`);

    if (credentials.phoneNumberId) admin.whatsappPhoneNumberId = credentials.phoneNumberId;
    if (credentials.wabaId) admin.whatsappWabaId = credentials.wabaId;
    admin.whatsappAccessToken = credentials.accessToken;
    admin.whatsappConnectedAt = new Date();

    return this.adminRepo.save(admin);
  }

  async clearWhatsAppCredentials(adminId: string) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException(`Admin with ID ${adminId} not found`);

    admin.whatsappPhoneNumberId = undefined;
    admin.whatsappWabaId = undefined;
    admin.whatsappAccessToken = undefined;
    admin.whatsappConnectedAt = undefined;

    return this.adminRepo.save(admin);
  }

  async getWhatsAppStatus(adminId: string) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException(`Admin with ID ${adminId} not found`);

    const isConnected = !!(admin.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN);
    const phoneNumberId = admin.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const wabaId = admin.whatsappWabaId || undefined;

    return {
      isConnected,
      isEmbedded: !!admin.whatsappAccessToken,
      phoneNumberId: phoneNumberId ? `***${phoneNumberId.slice(-4)}` : null,
      wabaId: wabaId ? `***${wabaId.slice(-4)}` : null,
      connectedAt: admin.whatsappConnectedAt || null,
    };
  }
}

