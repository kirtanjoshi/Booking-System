# Database Schema (TypeORM entities, Supabase Postgres)

Naming: use a SnakeNamingStrategy so entity camelCase properties map to
snake_case columns (Supabase/Postgres convention). Every timestamp column is
`timestamptz`. All entities use uuid primary keys.

```typescript
// admin.entity.ts
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column() businessName: string;
  @Column({ unique: true }) phoneNumber: string;
  @Column({ default: 'Asia/Kathmandu' }) timezone: string;
  @Column() passwordHash: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;

  @OneToMany(() => AvailabilityRule, (r) => r.admin) availabilityRules: AvailabilityRule[];
  @OneToMany(() => DateOverride, (d) => d.admin) dateOverrides: DateOverride[];
  @OneToMany(() => SessionType, (s) => s.admin) sessionTypes: SessionType[];
  @OneToMany(() => Booking, (b) => b.admin) bookings: Booking[];
}

// availability-rule.entity.ts
// Recurring weekly availability. Multiple rows per day = multiple blocks
// (e.g. Monday: 10:00-13:00 AND 17:00-19:00). Not every day needs a row.
@Entity('availability_rules')
@Index(['admin', 'dayOfWeek'])
export class AvailabilityRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' }) admin: Admin;
  @Column({ type: 'smallint' }) dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  @Column({ type: 'time' }) startTime: string;      // "10:00"
  @Column({ type: 'time' }) endTime: string;        // "13:00"
  @Column({ default: true }) isActive: boolean;
}

// date-override.entity.ts
// One-off exceptions: a holiday closure, or opening on an otherwise-empty day.
@Entity('date_overrides')
export class DateOverride {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' }) admin: Admin;
  @Column({ type: 'date' }) date: string;
  @Column({ default: true }) isClosed: boolean;
  @Column({ type: 'time', nullable: true }) startTime?: string;
  @Column({ type: 'time', nullable: true }) endTime?: string;
}

// session-type.entity.ts
@Entity('session_types')
export class SessionType {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' }) admin: Admin;
  @Column() name: string; // e.g. "Quick Question", "Full Birth Chart Reading"
  @Column() durationMinutes: number;
  @Column({ default: 0 }) bufferMinutes: number; // gap enforced after this session type
  @Column({ nullable: true }) description?: string;
  @Column({ default: true }) isActive: boolean;
  @OneToMany(() => Booking, (b) => b.sessionType) bookings: Booking[];
}

// client.entity.ts
@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) phoneNumber: string;
  @Column({ nullable: true }) name?: string;
  @Column({ type: 'date', nullable: true }) birthDate?: string;
  @Column({ nullable: true }) birthTime?: string; // "14:30" - nullable, not everyone knows exact time
  @Column({ nullable: true }) birthPlace?: string;
  @Column({ nullable: true }) notes?: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @OneToMany(() => Booking, (b) => b.client) bookings: Booking[];
  @OneToMany(() => MessageLog, (m) => m.client) messages: MessageLog[];
}

export enum BookingStatus { PENDING = 'PENDING', CONFIRMED = 'CONFIRMED', CANCELLED = 'CANCELLED', COMPLETED = 'COMPLETED', NO_SHOW = 'NO_SHOW' }
export enum BookingSource { WHATSAPP = 'WHATSAPP', ADMIN = 'ADMIN' }

// booking.entity.ts
@Entity('bookings')
@Index(['admin', 'scheduledStart'])
export class Booking {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' }) admin: Admin;
  @ManyToOne(() => Client, { onDelete: 'RESTRICT' }) client: Client;
  @ManyToOne(() => SessionType, { onDelete: 'RESTRICT' }) sessionType: SessionType;
  @Column({ type: 'timestamptz' }) scheduledStart: Date;
  @Column({ type: 'timestamptz' }) scheduledEnd: Date; // must already include sessionType.bufferMinutes
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING }) status: BookingStatus;
  @Column({ type: 'enum', enum: BookingSource }) source: BookingSource;
  @Column({ nullable: true }) cancelledReason?: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
  @OneToMany(() => MessageLog, (m) => m.booking) messages: MessageLog[];

  // Generated column backing the exclusion constraint below. Do not let
  // TypeORM's migration generator touch this — see the hand-written
  // migration note.
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

export enum MessageDirection { INBOUND = 'INBOUND', OUTBOUND = 'OUTBOUND' }
export enum MessageType { TEXT = 'TEXT', BUTTON = 'BUTTON', LIST = 'LIST', TEMPLATE = 'TEMPLATE', STATUS_UPDATE = 'STATUS_UPDATE' }

// message-log.entity.ts
@Entity('message_logs')
export class MessageLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Client, { onDelete: 'RESTRICT' }) client: Client;
  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' }) booking?: Booking;
  @Column({ type: 'enum', enum: MessageDirection }) direction: MessageDirection;
  @Column({ type: 'enum', enum: MessageType }) messageType: MessageType;
  @Column('text') content: string;
  @Column({ nullable: true, unique: true }) whatsappMessageId?: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
```

## Double-booking prevention + RLS (hand-written TypeORM migration, not auto-generated)

TypeORM cannot express exclusion constraints and will try to "simplify" the
generated `timeRange` column away if you let it auto-generate this migration.
Write it by hand instead:

```sql
-- extensions schema, per Supabase convention
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  admin_id WITH =,
  time_range WITH &&
) WHERE (status IN ('PENDING', 'CONFIRMED'));

-- RLS: enabled with zero policies on every table. The backend's Postgres
-- role bypasses RLS by default; this only blocks Supabase's public
-- PostgREST/anon API from reading or writing these tables directly.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
```

Include a working `down()` that drops the constraint, the RLS flags, and the
extension.

Note: `scheduled_end` must be computed as
`scheduled_start + durationMinutes + bufferMinutes` at booking-creation time
in application code, so the constraint enforces the gap between sessions for
free.