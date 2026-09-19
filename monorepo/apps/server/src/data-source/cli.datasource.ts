import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { entities } from './runtime.datasource';
import { InitialSchemaAndExclusion1700000000000 } from '../database/migrations/1700000000000-InitialSchemaAndExclusion';
import { AddWhatsAppCredentialsToAdmin1700000000001 } from '../database/migrations/1700000000001-AddWhatsAppCredentialsToAdmin';
import { RenameAdminToUserAndAddNotesImages1700000000002 } from '../database/migrations/1700000000002-RenameAdminToUserAndAddNotesImages';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const cliUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const isCliLocal = cliUrl.includes('localhost') || cliUrl.includes('127.0.0.1') || process.env.DATABASE_SSL === 'false';

export const cliDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: cliUrl,
  ssl: isCliLocal ? false : { rejectUnauthorized: false },
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities,
  migrations: [
    InitialSchemaAndExclusion1700000000000,
    AddWhatsAppCredentialsToAdmin1700000000001,
    RenameAdminToUserAndAddNotesImages1700000000002,
  ],
};

const cliDataSource = new DataSource(cliDataSourceOptions);
export default cliDataSource;
