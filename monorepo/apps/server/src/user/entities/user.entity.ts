import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AvailabilityRule } from '../../availability/entities/availability-rule.entity';
import { DateOverride } from '../../availability/entities/date-override.entity';
import { SessionType } from '../../session-type/entities/session-type.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { Role } from '../../role/entities/role.entity';
import { ClientDetails } from '../../client/entities/client_details.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ name: 'role', type: 'varchar', default: 'USER' })
  roleCode?: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  businessName?: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ default: 'Asia/Kathmandu' })
  timezone: string;

  @Column({ nullable: true })
  passwordHash?: string;

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

  @OneToOne(() => ClientDetails, (cd) => cd.user, { nullable: true })
  clientDetails?: ClientDetails;
}

// Backward-compatible alias for existing imports
export { User as Admin };
