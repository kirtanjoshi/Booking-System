import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameClientsToClientDetails1700000000004 implements MigrationInterface {
  name = 'RenameClientsToClientDetails1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS clients RENAME TO client_details;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS client_details RENAME TO clients;
    `);
  }
}
