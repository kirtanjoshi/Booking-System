import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User, Admin } from '../user/entities/user.entity';
import { AvailabilityRule } from '../availability/entities/availability-rule.entity';
import { DateOverride } from '../availability/entities/date-override.entity';
import { SessionType } from '../session-type/entities/session-type.entity';
import { ClientDetails, Client } from '../client/entities/client_details.entity';
import { Role } from '../role/entities/role.entity';
import { Booking } from '../booking/entities/booking.entity';
import { MessageLog } from '../message-log/entities/message-log.entity';

// Robust .env resolution across different execution contexts (cwd at monorepo root or apps/server)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

export const entities = [
  User,
  Admin,
  Role,
  AvailabilityRule,
  DateOverride,
  SessionType,
  ClientDetails,
  Client,
  Booking,
  MessageLog,
];

const dbUrl = process.env.DATABASE_URL || '';
const isLocal =
  dbUrl.includes('localhost') ||
  dbUrl.includes('127.0.0.1') ||
  ['false', '0', 'off'].includes(String(process.env.DATABASE_SSL).toLowerCase());
const caCert = process.env.DATABASE_CA_CERT;
const rejectUnauthorized = process.env.DATABASE_REJECT_UNAUTHORIZED === 'true' || process.env.NODE_ENV === 'production';

export const runtimeDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl,
  ssl: isLocal
    ? false
    : {
        rejectUnauthorized,
        ...(caCert ? { ca: caCert } : {}),
      },
  synchronize: false,
  migrationsRun: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities,
};

export const runtimeDataSource = new DataSource(runtimeDataSourceOptions);
