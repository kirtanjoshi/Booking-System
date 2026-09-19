import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Admin } from '../admin/entities/admin.entity';
import { AvailabilityRule } from '../availability/entities/availability-rule.entity';
import { DateOverride } from '../availability/entities/date-override.entity';
import { SessionType } from '../session-type/entities/session-type.entity';
import { Client } from '../client/entities/client.entity';
import { Booking } from '../booking/entities/booking.entity';
import { MessageLog } from '../message-log/entities/message-log.entity';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const entities = [
  Admin,
  AvailabilityRule,
  DateOverride,
  SessionType,
  Client,
  Booking,
  MessageLog,
];

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || process.env.DATABASE_SSL === 'false';

export const runtimeDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  synchronize: false,
  migrationsRun: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities,
};

export const runtimeDataSource = new DataSource(runtimeDataSourceOptions);
