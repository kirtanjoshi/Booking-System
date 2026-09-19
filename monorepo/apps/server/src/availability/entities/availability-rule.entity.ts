import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';

@Entity('availability_rules')
@Index(['admin', 'dayOfWeek'])
export class AvailabilityRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' })
  admin: Admin;

  @Column({ type: 'smallint' })
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday

  @Column({ type: 'time' })
  startTime: string; // "10:00"

  @Column({ type: 'time' })
  endTime: string; // "13:00"

  @Column({ default: true })
  isActive: boolean;
}
