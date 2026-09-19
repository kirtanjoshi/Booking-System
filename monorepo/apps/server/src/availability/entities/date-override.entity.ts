import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';

@Entity('date_overrides')
export class DateOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' })
  admin: Admin;

  @Column({ type: 'date' })
  date: string; // "2026-09-20"

  @Column({ default: true })
  isClosed: boolean;

  @Column({ type: 'time', nullable: true })
  startTime?: string;

  @Column({ type: 'time', nullable: true })
  endTime?: string;
}
