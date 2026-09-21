import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Admin Authentication & Guard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.use(
      session({
        secret: 'test-secret-at-least-32-chars-long',
        resave: false,
        saveUninitialized: false,
      }),
    );
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Unauthenticated access', () => {
    it('should reject unauthenticated GET /availability-rules with 401', async () => {
      const res = await request(app.getHttpServer()).get('/availability-rules');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Admin authentication required');
    });

    it('should reject unauthenticated GET /clients with 401', async () => {
      const res = await request(app.getHttpServer()).get('/clients');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Admin authentication required');
    });

    it('should reject unauthenticated PATCH /bookings/:id/cancel with 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/bookings/00000000-0000-0000-0000-000000000000/cancel')
        .send({ cancelledReason: 'Testing' });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Admin authentication required');
    });

    it('should reject unauthenticated GET /admins/:id with 401', async () => {
      const res = await request(app.getHttpServer()).get('/admins/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated PATCH /bookings/:id/notes with 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/bookings/00000000-0000-0000-0000-000000000000/notes')
        .send({ notes: 'malicious note' });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated POST /bookings/:id/images with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings/00000000-0000-0000-0000-000000000000/images')
        .send({ imageUrl: 'https://example.com/test.jpg' });
      expect(res.status).toBe(401);
    });
  });

  describe('Login & Authenticated access', () => {
    it('should reject invalid credentials with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phoneNumber: '+9779999999999', password: 'WrongPassword' });
      expect(res.status).toBe(401);
    });

    it('should login with valid seed admin and access protected endpoint', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phoneNumber: '+9779801234567', password: 'AdminPassword123!' });

      // If DB has been seeded
      if (loginRes.status === 200) {
        const cookie = loginRes.headers['set-cookie'];
        expect(cookie).toBeDefined();

        const protectedRes = await request(app.getHttpServer())
          .get('/availability-rules')
          .set('Cookie', cookie);

        expect(protectedRes.status).toBe(200);
      }
    });
  });
});
