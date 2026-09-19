import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { MessageLog } from '../../message-log/entities/message-log.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'date', nullable: true })
  birthDate?: string;

  @Column({ nullable: true })
  birthTime?: string; // "14:30" - nullable, not everyone knows exact time

  @Column({ nullable: true })
  birthPlace?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Booking, (b) => b.client)
  bookings: Booking[];

  @OneToMany(() => MessageLog, (m) => m.client)
  messages: MessageLog[];
}
