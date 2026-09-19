import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Admin } from '../admin/entities/admin.entity';
import { SessionType } from '../session-type/entities/session-type.entity';
import { Client } from '../client/entities/client.entity';
import { MessageLogService } from '../message-log/message-log.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingSource, BookingStatus, MessageDirection, MessageType } from '../common/enums';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(SessionType)
    private readonly sessionTypeRepo: Repository<SessionType>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly dataSource: DataSource,
    private readonly messageLogService: MessageLogService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
  ) {}

  async getAll(options?: {
    adminId?: string;
    date?: string;
    upcomingOnly?: boolean;
  }): Promise<Booking[]> {
    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.sessionType', 'sessionType')
      .leftJoinAndSelect('booking.admin', 'admin')
      .orderBy('booking.scheduledStart', 'ASC');

    if (options?.adminId) {
      qb.andWhere('booking.admin_id = :adminId', { adminId: options.adminId });
    }

    if (options?.date) {
      const dayStart = new Date(`${options.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${options.date}T23:59:59.999Z`);
      qb.andWhere('booking.scheduledStart >= :dayStart AND booking.scheduledStart <= :dayEnd', {
        dayStart,
        dayEnd,
      });
    }

    if (options?.upcomingOnly) {
      qb.andWhere('booking.scheduledStart >= :now', { now: new Date() });
      qb.andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      });
    }

    return qb.getMany();
  }

  async getById(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['client', 'sessionType', 'admin', 'messages'],
    });
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      const admin = await manager.findOne(Admin, { where: { id: dto.adminId } });
      if (!admin) throw new NotFoundException(`Admin with ID ${dto.adminId} not found`);

      const sessionType = await manager.findOne(SessionType, {
        where: { id: dto.sessionTypeId },
      });
      if (!sessionType) {
        throw new NotFoundException(`SessionType with ID ${dto.sessionTypeId} not found`);
      }

      // Resolve or create Client
      let client: Client | null = null;
      if (dto.clientId) {
        client = await manager.findOne(Client, { where: { id: dto.clientId } });
      } else if (dto.clientPhoneNumber) {
        client = await manager.findOne(Client, {
          where: { phoneNumber: dto.clientPhoneNumber },
        });
        if (!client) {
          client = manager.create(Client, {
            phoneNumber: dto.clientPhoneNumber,
            name: dto.clientName,
            birthDate: dto.birthDate,
            birthTime: dto.birthTime,
            birthPlace: dto.birthPlace,
            notes: dto.notes,
          });
          client = await manager.save(client);
        } else {
          // Update client birth details if provided and not set
          if (dto.clientName && !client.name) client.name = dto.clientName;
          if (dto.birthDate && !client.birthDate) client.birthDate = dto.birthDate;
          if (dto.birthTime && !client.birthTime) client.birthTime = dto.birthTime;
          if (dto.birthPlace && !client.birthPlace) client.birthPlace = dto.birthPlace;
          if (dto.notes && !client.notes) client.notes = dto.notes;
          client = await manager.save(client);
        }
      }

      if (!client) {
        throw new BadRequestException('Client info (clientId or clientPhoneNumber) is required');
      }

      // Compute scheduledEnd = scheduledStart + durationMinutes + bufferMinutes
      const scheduledStart = new Date(dto.scheduledStart);
      const totalMinutes = sessionType.durationMinutes + (sessionType.bufferMinutes || 0);
      const scheduledEnd = new Date(scheduledStart.getTime() + totalMinutes * 60 * 1000);

      const booking = manager.create(Booking, {
        admin,
        client,
        sessionType,
        scheduledStart,
        scheduledEnd,
        status: dto.source === BookingSource.ADMIN ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
        source: dto.source,
      });

      try {
        const saved = await manager.save(Booking, booking);
        return saved;
      } catch (err: any) {
        // Postgres error code 23P01 is exclusion_violation
        if (
          err.code === '23P01' ||
          (err.message && err.message.includes('no_overlapping_bookings'))
        ) {
          throw new ConflictException(
            'The selected time slot overlaps with an existing booking. Please select another slot.',
          );
        }
        throw err;
      }
    });
  }

  async cancelBooking(id: string, dto: CancelBookingDto): Promise<Booking> {
    const booking = await this.getById(id);

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledReason = dto.cancelledReason;
    const saved = await this.bookingRepo.save(booking);

    // Log status update in MessageLog per SCHEMA.md
    const logContent = `Booking cancelled for ${booking.client.name || booking.client.phoneNumber} on ${booking.scheduledStart.toISOString()}. Reason: ${dto.cancelledReason}`;
    await this.messageLogService.logMessage({
      client: booking.client,
      booking: saved,
      direction: MessageDirection.OUTBOUND,
      messageType: MessageType.STATUS_UPDATE,
      content: logContent,
    });

    // Notify client via WhatsApp per Stage 3 requirement
    try {
      await this.whatsappService.sendCancellationNotice(saved, dto.cancelledReason);
    } catch (e) {
      console.warn('WhatsApp cancellation dispatch skipped/failed:', (e as any).message);
    }

    return saved;
  }

  async updateNotes(id: string, notes: string): Promise<Booking> {
    const booking = await this.getById(id);
    booking.notes = notes;
    return this.bookingRepo.save(booking);
  }

  async addImage(id: string, imageUrl: string): Promise<Booking> {
    const booking = await this.getById(id);
    booking.imageUrls = [...(booking.imageUrls || []), imageUrl];
    return this.bookingRepo.save(booking);
  }

  async getUserUpcomingBookings(phoneNumber: string): Promise<Booking[]> {
    const now = new Date();
    return this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.sessionType', 'sessionType')
      .leftJoinAndSelect('booking.admin', 'admin')
      .where('client.phoneNumber = :phoneNumber', { phoneNumber })
      .andWhere('booking.scheduledStart >= :now', { now })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .orderBy('booking.scheduledStart', 'ASC')
      .getMany();
  }

  async getUserBookingHistory(phoneNumber: string): Promise<Booking[]> {
    const now = new Date();
    return this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.sessionType', 'sessionType')
      .leftJoinAndSelect('booking.admin', 'admin')
      .where('client.phoneNumber = :phoneNumber', { phoneNumber })
      .andWhere('(booking.scheduledStart < :now OR booking.status IN (:...statuses))', {
        now,
        statuses: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      })
      .orderBy('booking.scheduledStart', 'DESC')
      .getMany();
  }
}
