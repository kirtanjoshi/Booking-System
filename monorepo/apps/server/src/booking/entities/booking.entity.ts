import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { Client } from '../../client/entities/client.entity';
import { SessionType } from '../../session-type/entities/session-type.entity';
import { MessageLog } from '../../message-log/entities/message-log.entity';
import { BookingSource, BookingStatus } from '../../common/enums';

@Entity('bookings')
@Index(['admin', 'scheduledStart'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' })
  admin: Admin;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT' })
  client: Client;

  @ManyToOne(() => SessionType, { onDelete: 'RESTRICT' })
  sessionType: SessionType;

  @Column({ type: 'timestamptz' })
  scheduledStart: Date;

  @Column({ type: 'timestamptz' })
  scheduledEnd: Date; // must already include sessionType.bufferMinutes

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: BookingSource })
  source: BookingSource;

  @Column({ nullable: true })
  cancelledReason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  imageUrls: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => MessageLog, (m) => m.booking)
  messages: MessageLog[];

  // Generated column backing the exclusion constraint
  @Column({
    type: 'tstzrange',
    generatedType: 'STORED',
    asExpression: `tstzrange(scheduled_start, scheduled_end, '[)')`,
    select: false,
    insert: false,
    update: false,
  })
  timeRange: string;
}
