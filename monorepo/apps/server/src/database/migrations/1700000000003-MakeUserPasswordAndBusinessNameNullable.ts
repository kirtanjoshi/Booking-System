import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUserPasswordAndBusinessNameNullable1700000000003 implements MigrationInterface {
  name = 'MakeUserPasswordAndBusinessNameNullable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create roles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR NOT NULL UNIQUE,
        title VARCHAR NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Insert default roles
    await queryRunner.query(`
      INSERT INTO roles (code, title, description)
      VALUES 
        ('ADMIN', 'ADMIN', 'Practitioner and Administrator with full management access'),
        ('USER', 'USER', 'Client / Customer User with portal and booking access')
      ON CONFLICT (code) DO NOTHING;
    `);

    // 3. Make password_hash and business_name nullable on users table
    await queryRunner.query(`
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      ALTER TABLE users ALTER COLUMN business_name DROP NOT NULL;
    `);

    // 4. Add role_id to users table and associate existing records
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
      UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'ADMIN') WHERE role = 'ADMIN' OR role IS NULL;
      UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'USER') WHERE role = 'USER';
    `);

    // 5. Add user_id to clients table
    await queryRunner.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 6. Backfill existing clients into users table
    await queryRunner.query(`
      INSERT INTO users (id, name, phone_number, role, role_id, timezone)
      SELECT 
        c.id, 
        COALESCE(c.name, 'Client'), 
        c.phone_number, 
        'USER',
        (SELECT id FROM roles WHERE code = 'USER'),
        'Asia/Kathmandu'
      FROM clients c
      ON CONFLICT (phone_number) DO NOTHING;
    `);

    // 7. Connect clients.user_id to users.id
    await queryRunner.query(`
      UPDATE clients 
      SET user_id = users.id 
      FROM users 
      WHERE clients.phone_number = users.phone_number;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clients DROP COLUMN IF EXISTS user_id;
      ALTER TABLE users DROP COLUMN IF EXISTS role_id;
      ALTER TABLE users ALTER COLUMN business_name SET NOT NULL;
      ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
      DROP TABLE IF EXISTS roles;
    `);
  }
}
