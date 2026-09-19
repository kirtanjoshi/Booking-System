import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { json } from 'express';
import { AppModule } from '../src/app.module';

describe('WhatsApp Webhook Security & Verification (e2e)', () => {
  let app: INestApplication;
  const testVerifyToken = 'test_verify_token_123';
  const testAppSecret = 'test_meta_app_secret_456';

  beforeAll(async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = testVerifyToken;
    process.env.WHATSAPP_APP_SECRET = testAppSecret;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(
      json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /webhooks/whatsapp (Handshake)', () => {
    it('should return challenge with 200 when verify token matches', async () => {
      const challenge = 'random_challenge_string_abc';
      const res = await request(app.getHttpServer())
        .get('/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': testVerifyToken,
          'hub.challenge': challenge,
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe(challenge);
    });

    it('should return 403 Forbidden when verify token does not match', async () => {
      const res = await request(app.getHttpServer())
        .get('/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'some_challenge',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhooks/whatsapp (HMAC Signature & Dedup)', () => {
    it('should reject payload with invalid signature with 403 Forbidden', async () => {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      const res = await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('x-hub-signature-256', 'sha256=invalid_hex_signature')
        .send(payload);

      expect(res.status).toBe(403);
    });

    it('should accept payload with valid HMAC-SHA256 signature', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: `wam_${Date.now()}`,
                      from: '9779800000000',
                      type: 'text',
                      text: { body: 'hello' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', testAppSecret);
      const signature = `sha256=${hmac.update(rawBody).digest('hex')}`;

      const res = await request(app.getHttpServer())
        .post('/webhooks/whatsapp')
        .set('x-hub-signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('EVENT_RECEIVED');
    });
  });
});
