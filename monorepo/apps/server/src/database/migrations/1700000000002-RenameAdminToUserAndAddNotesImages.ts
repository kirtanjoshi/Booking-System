import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAdminToUserAndAddNotesImages1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename admins table to users and add role column
    await queryRunner.query(`
      ALTER TABLE IF EXISTS admins RENAME TO users;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'ADMIN';
    `);

    // 2. Add notes and image_urls to bookings table
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS image_urls;
    `);

    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS role;
      ALTER TABLE IF EXISTS users RENAME TO admins;
    `);
  }
}
