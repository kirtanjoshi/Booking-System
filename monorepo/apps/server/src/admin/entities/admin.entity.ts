import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { AvailabilityRule } from '../../availability/entities/availability-rule.entity';
import { DateOverride } from '../../availability/entities/date-override.entity';
import { SessionType } from '../../session-type/entities/session-type.entity';
import { Booking } from '../../booking/entities/booking.entity';

import { UserRole } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: UserRole.ADMIN })
  role: UserRole;

  @Column()
  name: string;

  @Column({ nullable: true })
  businessName?: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ default: 'Asia/Kathmandu' })
  timezone: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  whatsappPhoneNumberId?: string;

  @Column({ nullable: true })
  whatsappWabaId?: string;

  @Column({ type: 'text', nullable: true })
  whatsappAccessToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  whatsappConnectedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => AvailabilityRule, (r) => r.admin)
  availabilityRules: AvailabilityRule[];

  @OneToMany(() => DateOverride, (d) => d.admin)
  dateOverrides: DateOverride[];

  @OneToMany(() => SessionType, (s) => s.admin)
  sessionTypes: SessionType[];

  @OneToMany(() => Booking, (b) => b.admin)
  bookings: Booking[];
}

export { User as Admin };

