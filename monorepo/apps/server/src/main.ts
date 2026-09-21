import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Robust .env resolution across execution contexts
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/server/.env') });

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Startup configuration validation & fail-fast checks
  if (!process.env.DATABASE_URL) {
    throw new Error('FATAL: DATABASE_URL must be configured.');
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && (!sessionSecret || sessionSecret.length < 32)) {
    throw new Error('FATAL: SESSION_SECRET must be configured with at least 32 characters in production.');
  }

  if (isProduction) {
    if (!process.env.WHATSAPP_APP_SECRET) {
      throw new Error('FATAL: WHATSAPP_APP_SECRET must be configured in production for webhook signature verification.');
    }
    if (!process.env.WHATSAPP_VERIFY_TOKEN) {
      throw new Error('FATAL: WHATSAPP_VERIFY_TOKEN must be configured in production for webhook handshake verification.');
    }
    if (!process.env.CORS_ALLOWED_ORIGINS && !process.env.CORS_ORIGIN) {
      throw new Error('FATAL: CORS_ALLOWED_ORIGINS or CORS_ORIGIN must be explicitly configured in production.');
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProduction ? undefined : false,
    }),
  );

  // Preserve rawBody for Meta webhook signature verification with reduced 1mb limit
  app.use(
    json({
      limit: '1mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Session middleware
  app.use(
    session({
      name: 'connect.sid',
      secret: sessionSecret || 'astrologer-secret-key-32-chars-minimum',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  // Restrict CORS to explicit allowed origins
  const allowedOrigins = (
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.CORS_ORIGIN ||
    'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin) || (!isProduction && origin.includes('localhost'))) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, x-hub-signature-256',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Astrologer Server running on port ${port}`);
}

bootstrap();
