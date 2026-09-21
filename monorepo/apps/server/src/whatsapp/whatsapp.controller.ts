import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Headers,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { WhatsAppService } from './whatsapp.service';

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  // Meta webhook verification handshake
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
    this.logger.log(`Webhook verification request received. mode: ${mode}`);

    if (mode === 'subscribe' && expectedToken && token) {
      const tokenBuf = Buffer.from(token);
      const expectedBuf = Buffer.from(expectedToken);
      const isMatch =
        tokenBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(tokenBuf, expectedBuf);

      if (isMatch) {
        this.logger.log('✅ Webhook handshake verified successfully!');
        return res.status(HttpStatus.OK).send(challenge);
      }
    }

    this.logger.warn('❌ Webhook handshake failed: token mismatch or invalid parameters');
    throw new ForbiddenException('Verification token mismatch');
  }

  // Inbound webhook events
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log(`📥 Inbound WhatsApp Webhook received! Signature: ${signature}`);
    // 1. Webhook security: verify HMAC-SHA256 signature using raw body
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const isValid = this.whatsappService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      this.logger.warn('❌ Invalid X-Hub-Signature-256 signature');
      throw new ForbiddenException('Invalid X-Hub-Signature-256 signature');
    }

    // 2. Process message & dedup
    try {
      await this.whatsappService.handleInboundPayload(req.body);
    } catch (err: any) {
      this.logger.error(`Error processing webhook payload: ${err.message}`);
    }

    return { status: 'EVENT_RECEIVED' };
  }
}
