import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaAndExclusion1700000000000 implements MigrationInterface {
  name = 'InitialSchemaAndExclusion1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure extensions schema and btree_gist extension exist
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS extensions;`);
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;`
    );
    await queryRunner.query(`SET search_path TO public, extensions;`);

    // 2. Admins table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        business_name VARCHAR NOT NULL,
        phone_number VARCHAR NOT NULL UNIQUE,
        timezone VARCHAR NOT NULL DEFAULT 'Asia/Kathmandu',
        password_hash VARCHAR NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. Availability rules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS availability_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
        day_of_week SMALLINT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_availability_rules_admin_day 
      ON availability_rules (admin_id, day_of_week);
    `);

    // 4. Date overrides table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS date_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
        date DATE NOT NULL,
        is_closed BOOLEAN NOT NULL DEFAULT true,
        start_time TIME NULL,
        end_time TIME NULL
      );
    `);

    // 5. Session types table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
        name VARCHAR NOT NULL,
        duration_minutes INTEGER NOT NULL,
        buffer_minutes INTEGER NOT NULL DEFAULT 0,
        description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);

    // 6. Clients table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR NOT NULL UNIQUE,
        name VARCHAR NULL,
        birth_date DATE NULL,
        birth_time VARCHAR NULL,
        birth_place VARCHAR NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 7. Bookings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        session_type_id UUID NOT NULL REFERENCES session_types(id) ON DELETE RESTRICT,
        scheduled_start TIMESTAMPTZ NOT NULL,
        scheduled_end TIMESTAMPTZ NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        source VARCHAR NOT NULL,
        cancelled_reason TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_admin_start 
      ON bookings (admin_id, scheduled_start);
    `);

    // Add generated time_range column for exclusion constraint
    await queryRunner.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS time_range tstzrange 
      GENERATED ALWAYS AS (tstzrange(scheduled_start, scheduled_end, '[)')) STORED;
    `);

    // Exclusion constraint for double-booking prevention
    await queryRunner.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT no_overlapping_bookings
      EXCLUDE USING gist (
        admin_id WITH =,
        time_range WITH &&
      ) WHERE (status IN ('PENDING', 'CONFIRMED'));
    `);

    // 8. Message logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        booking_id UUID NULL REFERENCES bookings(id) ON DELETE SET NULL,
        direction VARCHAR NOT NULL,
        message_type VARCHAR NOT NULL,
        content TEXT NOT NULL,
        whatsapp_message_id VARCHAR NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 9. Enable Row Level Security (RLS) on all 7 tables with zero permissive policies
    const tables = [
      'admins',
      'availability_rules',
      'date_overrides',
      'session_types',
      'clients',
      'bookings',
      'message_logs',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'message_logs',
      'bookings',
      'clients',
      'session_types',
      'date_overrides',
      'availability_rules',
      'admins',
    ];

    // Disable RLS
    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY;`);
    }

    // Drop exclusion constraint
    await queryRunner.query(
      `ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;`
    );

    // Drop tables in reverse order
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }

    // Drop extension
    await queryRunner.query(`DROP EXTENSION IF EXISTS btree_gist CASCADE;`);
  }
}
