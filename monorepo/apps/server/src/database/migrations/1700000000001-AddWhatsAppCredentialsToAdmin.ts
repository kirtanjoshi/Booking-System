import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsAppCredentialsToAdmin1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS whatsapp_waba_id VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT NULL,
      ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE admins
      DROP COLUMN IF EXISTS whatsapp_phone_number_id,
      DROP COLUMN IF EXISTS whatsapp_waba_id,
      DROP COLUMN IF EXISTS whatsapp_access_token,
      DROP COLUMN IF EXISTS whatsapp_connected_at;
    `);
  }
}
