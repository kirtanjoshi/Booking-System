import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityRule } from './entities/availability-rule.entity';
import { DateOverride } from './entities/date-override.entity';
import { SessionType } from '../session-type/entities/session-type.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Admin } from '../admin/entities/admin.entity';
import { BookingStatus } from '../common/enums';
import {
  CreateAvailabilityRuleDto,
  UpdateAvailabilityRuleDto,
} from './dto/create-availability-rule.dto';
import { CreateDateOverrideDto } from './dto/create-date-override.dto';

export interface FreeTimeSlot {
  start: string; // ISO string
  end: string;   // ISO string (including buffer)
  displayTime: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilityRule)
    private readonly ruleRepo: Repository<AvailabilityRule>,
    @InjectRepository(DateOverride)
    private readonly overrideRepo: Repository<DateOverride>,
    @InjectRepository(SessionType)
    private readonly sessionTypeRepo: Repository<SessionType>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async getAvailability(
    adminId: string,
    dateStr: string,
    sessionTypeId: string,
  ): Promise<FreeTimeSlot[]> {
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Invalid date format, expected YYYY-MM-DD');
    }

    const sessionType = await this.sessionTypeRepo.findOne({
      where: { id: sessionTypeId },
    });
    if (!sessionType) {
      throw new NotFoundException(`SessionType with ID ${sessionTypeId} not found`);
    }

    const slotDurationMinutes =
      sessionType.durationMinutes + (sessionType.bufferMinutes || 0);
    const slotDurationMs = slotDurationMinutes * 60 * 1000;

    // Check date overrides first
    const override = await this.overrideRepo.findOne({
      where: { admin: { id: adminId }, date: dateStr },
    });

    let windows: { start: string; end: string }[] = [];

    if (override) {
      if (override.isClosed) {
        return [];
      }
      if (override.startTime && override.endTime) {
        windows.push({ start: override.startTime, end: override.endTime });
      }
    } else {
      // Resolve dayOfWeek (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const parsedDate = new Date(`${dateStr}T00:00:00Z`);
      const dayOfWeek = parsedDate.getUTCDay();

      const rules = await this.ruleRepo.find({
        where: { admin: { id: adminId }, dayOfWeek, isActive: true },
        order: { startTime: 'ASC' },
      });

      for (const rule of rules) {
        windows.push({ start: rule.startTime, end: rule.endTime });
      }
    }

    if (windows.length === 0) {
      return [];
    }

    // Fetch existing bookings for this admin overlapping this day
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const existingBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.admin_id = :adminId', { adminId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere('booking.scheduled_start < :dayEnd AND booking.scheduled_end > :dayStart', {
        dayStart,
        dayEnd,
      })
      .getMany();

    const candidateSlots: { start: Date; end: Date }[] = [];

    for (const win of windows) {
      // win.start and win.end format: "10:00" or "10:00:00"
      const startParts = win.start.split(':');
      const endParts = win.end.split(':');

      const winStartDate = new Date(`${dateStr}T00:00:00.000Z`);
      winStartDate.setUTCHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);

      const winEndDate = new Date(`${dateStr}T00:00:00.000Z`);
      winEndDate.setUTCHours(parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0, 0);

      let current = winStartDate.getTime();
      const endLimit = winEndDate.getTime();

      while (current + slotDurationMs <= endLimit) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current + slotDurationMs);

        // Check overlap with existing bookings:
        // Overlap: slotStart < booking.scheduledEnd && slotEnd > booking.scheduledStart
        const overlaps = existingBookings.some((b) => {
          const bStart = new Date(b.scheduledStart).getTime();
          const bEnd = new Date(b.scheduledEnd).getTime();
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });

        if (!overlaps) {
          candidateSlots.push({ start: slotStart, end: slotEnd });
        }

        current += slotDurationMs;
      }
    }

    return candidateSlots.map((s) => {
      const formatTime = (d: Date) => {
        const hours = d.getUTCHours();
        const minutes = d.getUTCMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
      };

      return {
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        displayTime: `${formatTime(s.start)} - ${formatTime(s.end)}`,
      };
    });
  }

  // AvailabilityRule CRUD
  async getAllRules(adminId?: string): Promise<AvailabilityRule[]> {
    return this.ruleRepo.find({
      where: adminId ? { admin: { id: adminId } } : {},
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async createRule(adminId: string, dto: CreateAvailabilityRuleDto): Promise<AvailabilityRule> {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const rule = this.ruleRepo.create({
      admin,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.ruleRepo.save(rule);
  }

  async updateRule(id: string, dto: UpdateAvailabilityRuleDto): Promise<AvailabilityRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`AvailabilityRule with ID ${id} not found`);

    if (dto.dayOfWeek !== undefined) rule.dayOfWeek = dto.dayOfWeek;
    if (dto.startTime !== undefined) rule.startTime = dto.startTime;
    if (dto.endTime !== undefined) rule.endTime = dto.endTime;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    return this.ruleRepo.save(rule);
  }

  async deleteRule(id: string): Promise<{ deleted: boolean }> {
    const res = await this.ruleRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`AvailabilityRule with ID ${id} not found`);
    return { deleted: true };
  }

  // DateOverride CRUD
  async getAllOverrides(adminId?: string): Promise<DateOverride[]> {
    return this.overrideRepo.find({
      where: adminId ? { admin: { id: adminId } } : {},
      order: { date: 'ASC' },
    });
  }

  async createOverride(adminId: string, dto: CreateDateOverrideDto): Promise<DateOverride> {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const override = this.overrideRepo.create({
      admin,
      date: dto.date,
      isClosed: dto.isClosed !== undefined ? dto.isClosed : true,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.overrideRepo.save(override);
  }

  async deleteOverride(id: string): Promise<{ deleted: boolean }> {
    const res = await this.overrideRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`DateOverride with ID ${id} not found`);
    return { deleted: true };
  }
}
