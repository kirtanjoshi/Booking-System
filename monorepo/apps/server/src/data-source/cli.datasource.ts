import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { entities } from './runtime.datasource';
import { InitialSchemaAndExclusion1700000000000 } from '../database/migrations/1700000000000-InitialSchemaAndExclusion';
import { AddWhatsAppCredentialsToAdmin1700000000001 } from '../database/migrations/1700000000001-AddWhatsAppCredentialsToAdmin';
import { RenameAdminToUserAndAddNotesImages1700000000002 } from '../database/migrations/1700000000002-RenameAdminToUserAndAddNotesImages';
import { MakeUserPasswordAndBusinessNameNullable1700000000003 } from '../database/migrations/1700000000003-MakeUserPasswordAndBusinessNameNullable';
import { RenameClientsToClientDetails1700000000004 } from '../database/migrations/1700000000004-RenameClientsToClientDetails';

// Robust .env resolution across different execution contexts (cwd at monorepo root or apps/server)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

const cliUrl = process.env.DIRECT_URL;
if (!cliUrl) {
  throw new Error(
    'FATAL: DIRECT_URL must be specified to run TypeORM migrations (port 5432). Never run migrations against pooled DATABASE_URL.',
  );
}

const isCliLocal =
  cliUrl.includes('localhost') ||
  cliUrl.includes('127.0.0.1') ||
  ['false', '0', 'off'].includes(String(process.env.DATABASE_SSL).toLowerCase());

const caCert = process.env.DATABASE_CA_CERT;
const rejectUnauthorized = process.env.DATABASE_REJECT_UNAUTHORIZED === 'true' || process.env.NODE_ENV === 'production';

export const cliDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: cliUrl,
  ssl: isCliLocal
    ? false
    : {
        rejectUnauthorized,
        ...(caCert ? { ca: caCert } : {}),
      },
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities,
  migrations: [
    InitialSchemaAndExclusion1700000000000,
    AddWhatsAppCredentialsToAdmin1700000000001,
    RenameAdminToUserAndAddNotesImages1700000000002,
    MakeUserPasswordAndBusinessNameNullable1700000000003,
    RenameClientsToClientDetails1700000000004,
  ],
};

const cliDataSource = new DataSource(cliDataSourceOptions);
export default cliDataSource;
