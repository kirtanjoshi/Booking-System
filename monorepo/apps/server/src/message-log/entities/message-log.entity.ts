import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Client } from '../../client/entities/client.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { MessageDirection, MessageType } from '../../common/enums';

@Entity('message_logs')
export class MessageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT' })
  client: Client;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  booking?: Booking;

  @Column({ type: 'enum', enum: MessageDirection })
  direction: MessageDirection;

  @Column({ type: 'enum', enum: MessageType })
  messageType: MessageType;

  @Column('text')
  content: string;

  @Column({ nullable: true, unique: true })
  whatsappMessageId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
