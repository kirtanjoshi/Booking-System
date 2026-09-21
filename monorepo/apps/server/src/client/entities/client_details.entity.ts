import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { MessageLog } from '../../message-log/entities/message-log.entity';
import { User } from '../../user/entities/user.entity';

@Entity('client_details')
export class ClientDetails {
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

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @OneToOne(() => User, (u) => u.clientDetails, { nullable: true, eager: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => Booking, (b) => b.client)
  bookings: Booking[];

  @OneToMany(() => MessageLog, (m) => m.client)
  messages: MessageLog[];
}

// Backward-compatible alias for existing codebase imports
export { ClientDetails as Client };
