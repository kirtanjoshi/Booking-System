import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppEmbeddedSignupCallbackDto } from './dto/whatsapp-embedded-signup.dto';

@Controller('whatsapp/embedded-signup')
@UseGuards(AdminAuthGuard)
export class WhatsAppEmbeddedSignupController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Req() req: Request,
    @Body() dto: WhatsAppEmbeddedSignupCallbackDto,
  ) {
    const adminId = (req.session as any)?.adminId;
    return this.whatsappService.exchangeEmbeddedSignupCode(adminId, dto);
  }

  @Get('status')
  async getStatus(@Req() req: Request) {
    const adminId = (req.session as any)?.adminId;
    return this.whatsappService.getEmbeddedSignupStatus(adminId);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Req() req: Request) {
    const adminId = (req.session as any)?.adminId;
    return this.whatsappService.disconnectWhatsApp(adminId);
  }
}
