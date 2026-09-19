import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BookingSource } from '../src/common/enums';
import { DataSource } from 'typeorm';
import { Admin } from '../src/admin/entities/admin.entity';
import { SessionType } from '../src/session-type/entities/session-type.entity';

describe('Booking Concurrency & Double-Booking Prevention (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminId: string;
  let sessionTypeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    dataSource = app.get(DataSource);
    const admin = await dataSource.getRepository(Admin).findOne({ where: {} });
    const sessionType = await dataSource.getRepository(SessionType).findOne({ where: {} });

    if (admin) adminId = admin.id;
    if (sessionType) sessionTypeId = sessionType.id;
  });

  beforeEach(async () => {
    // Clean up any bookings from prior test runs
    await dataSource.query(
      `DELETE FROM bookings WHERE client_id IN (
        SELECT id FROM clients WHERE phone_number IN ('+9779811111111', '+9779822222222')
      )`,
    );
  });

  afterAll(async () => {
    // Clean up test bookings
    await dataSource.query(
      `DELETE FROM bookings WHERE client_id IN (
        SELECT id FROM clients WHERE phone_number IN ('+9779811111111', '+9779822222222')
      )`,
    );
    await app.close();
  });

  it('concurrently booking the exact same overlapping slot should allow only ONE to succeed', async () => {
    if (!adminId || !sessionTypeId) {
      console.warn('Skipping test: DB must be seeded with admin and sessionType');
      return;
    }

    const testSlotStart = new Date(Date.now() + 86400000 * 365 + Math.floor(Math.random() * 100000000)).toISOString();

    const bookingPayload1 = {
      adminId,
      sessionTypeId,
      scheduledStart: testSlotStart,
      source: BookingSource.WHATSAPP,
      clientPhoneNumber: '+9779811111111',
      clientName: 'Client Alpha',
    };

    const bookingPayload2 = {
      adminId,
      sessionTypeId,
      scheduledStart: testSlotStart,
      source: BookingSource.ADMIN,
      clientPhoneNumber: '+9779822222222',
      clientName: 'Client Beta',
    };

    // Fire both requests concurrently using Promise.all
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer()).post('/bookings').send(bookingPayload1),
      request(app.getHttpServer()).post('/bookings').send(bookingPayload2),
    ]);

    const statuses = [res1.status, res2.status];

    // Exactly one should succeed (201 Created) and the other should fail with 409 Conflict
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const conflictResponse = res1.status === 409 ? res1 : res2;
    expect(conflictResponse.body.message).toMatch(/overlaps with an existing/i);
  });
});
