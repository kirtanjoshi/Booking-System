import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('session_types')
export class SessionType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' })
  admin: Admin;

  @Column()
  name: string; // e.g. "Quick Question", "Full Birth Chart Reading"

  @Column()
  durationMinutes: number;

  @Column({ default: 0 })
  bufferMinutes: number; // gap enforced after this session type

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Booking, (b) => b.sessionType)
  bookings: Booking[];
}
