import {
  Injectable,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { MessageLogService } from '../message-log/message-log.service';
import { ClientService } from '../client/client.service';
import { AvailabilityService } from '../availability/availability.service';
import { SessionTypeService } from '../session-type/session-type.service';
import { BookingService } from '../booking/booking.service';
import { AdminService } from '../admin/admin.service';
import { Client } from '../client/entities/client.entity';
import { Booking } from '../booking/entities/booking.entity';
import {
  BookingSource,
  MessageDirection,
  MessageType,
} from '../common/enums';
import { WhatsAppEmbeddedSignupCallbackDto } from './dto/whatsapp-embedded-signup.dto';
import { getLocalDateString, formatInTimeZone } from '../common/utils/timezone.utils';

interface ConversationState {
  step:
    | 'AWAITING_SERVICE'
    | 'AWAITING_QUANTITY'
    | 'AWAITING_SLOT'
    | 'AWAITING_NAME_ADDRESS'
    | 'AWAITING_CONFIRMATION'
    | 'AWAITING_SAME_DAY_CHOICE';
  serviceType?: 'JATA' | 'SAIET';
  serviceName?: string;
  quantity?: number;
  totalPrice?: number;
  sessionTypeId?: string;
  selectedSlot?: string;
  adminId?: string;
  clientName?: string;
  address?: string;
  rescheduleBookingId?: string;
  existingBookingIdOnDay?: string;
}


@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly graphApiVersion = 'v21.0';
  private conversationStates = new Map<string, ConversationState>();

  constructor(
    private readonly messageLogService: MessageLogService,
    private readonly clientService: ClientService,
    private readonly availabilityService: AvailabilityService,
    private readonly sessionTypeService: SessionTypeService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
  ) {}

  // 1. Verify Meta Webhook HMAC-SHA256
  verifyWebhookSignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      this.logger.warn('WHATSAPP_APP_SECRET is not configured; signature check will fail');
      return false;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      this.logger.warn(`Missing or invalid x-hub-signature-256 header: ${signatureHeader}`);
      return false;
    }

    const expectedSignature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', appSecret);
    const calculatedSignature = hmac.update(rawBody).digest('hex');

    try {
      const match = crypto.timingSafeEqual(
        Buffer.from(calculatedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
      if (!match) {
        this.logger.warn(`Signature mismatch! Expected: ${expectedSignature}, Calculated: ${calculatedSignature}`);
      }
      return match;
    } catch (err: any) {
      this.logger.error(`Error verifying signature: ${err.message}`);
      return false;
    }
  }

  // 2. Direct Meta Graph API HTTP call (supports dynamic admin credentials or .env fallback)
  private async sendGraphApiMessage(payload: any, adminId?: string): Promise<string | undefined> {
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (adminId) {
      try {
        const creds = await this.adminService.getAdminCredentials(adminId);
        if (creds?.whatsappPhoneNumberId && creds?.whatsappAccessToken) {
          phoneNumberId = creds.whatsappPhoneNumberId;
          accessToken = creds.whatsappAccessToken;
        }
      } catch (err: any) {
        this.logger.warn(`Could not load custom WhatsApp credentials for admin ${adminId}: ${err.message}`);
      }
    }

    if (!phoneNumberId || !accessToken) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN) are missing. Outbound message cannot be sent in production.',
        );
      }
      this.logger.warn('WhatsApp credentials not set; simulating outbound message send.');
      return `mock_msg_${Date.now()}`;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/${this.graphApiVersion}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data?.messages?.[0]?.id;
    } catch (error: any) {
      this.logger.error(
        `Meta Graph API send error: ${error.response?.data?.error?.message || error.message}`,
      );
      if (process.env.NODE_ENV === 'test' || accessToken.startsWith('test_') || accessToken === 'mock_token') {
        return `mock_test_msg_${Date.now()}`;
      }
      throw error;
    }
  }

  // Meta WhatsApp Embedded Signup OAuth exchange
  async exchangeEmbeddedSignupCode(adminId: string, dto: WhatsAppEmbeddedSignupCallbackDto) {
    const appId = process.env.META_APP_ID || process.env.WHATSAPP_APP_ID;
    const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

    if (!appId || !appSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: META_APP_ID or META_APP_SECRET is not configured for WhatsApp Embedded Signup OAuth exchange in production.',
        );
      }
      this.logger.warn('META_APP_ID or META_APP_SECRET not configured, simulating OAuth token exchange in development');
      const mockToken = `mock_eaab_token_${Date.now()}`;
      await this.adminService.updateWhatsAppCredentials(adminId, {
        phoneNumberId: dto.phoneNumberId || 'mock_phone_number_id',
        wabaId: dto.wabaId || 'mock_waba_id',
        accessToken: mockToken,
      });
      return {
        success: true,
        phoneNumberId: dto.phoneNumberId || 'mock_phone_number_id',
        wabaId: dto.wabaId || 'mock_waba_id',
      };
    }

    try {
      // 1. Exchange code for User/System Access Token
      const tokenUrl = `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`;
      const tokenRes = await axios.get(tokenUrl, {
        params: {
          client_id: appId,
          client_secret: appSecret,
          code: dto.code,
        },
      });

      const userAccessToken = tokenRes.data?.access_token;
      if (!userAccessToken) {
        throw new Error('Meta did not return an access token for authorization code');
      }

      // 2. Subscribe app to WABA webhooks if WABA ID is provided
      if (dto.wabaId) {
        try {
          await axios.post(
            `https://graph.facebook.com/${this.graphApiVersion}/${dto.wabaId}/subscribed_apps`,
            {},
            {
              headers: { Authorization: `Bearer ${userAccessToken}` },
            },
          );
          this.logger.log(`Subscribed webhooks for WABA ${dto.wabaId}`);
        } catch (subErr: any) {
          this.logger.warn(
            `Webhook auto-subscribe warning: ${subErr.response?.data?.error?.message || subErr.message}`,
          );
        }
      }

      // 3. Save credentials to admin record
      await this.adminService.updateWhatsAppCredentials(adminId, {
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessToken: userAccessToken,
      });

      return {
        success: true,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
      };
    } catch (err: any) {
      this.logger.error(
        `Embedded signup exchange failed: ${err.response?.data?.error?.message || err.message}`,
      );
      throw err;
    }
  }

  async getEmbeddedSignupStatus(adminId: string) {
    return this.adminService.getWhatsAppStatus(adminId);
  }

  async disconnectWhatsApp(adminId: string) {
    await this.adminService.clearWhatsAppCredentials(adminId);
    return { success: true, message: 'WhatsApp disconnected successfully' };
  }

  // 3. 24-Hour Customer Service Window check
  async isWithin24HourWindow(client: Client): Promise<boolean> {
    const lastInbound = await this.messageLogService.getLastInboundMessageDate(client.id);
    if (!lastInbound) return false;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastInbound.getTime() > twentyFourHoursAgo.getTime();
  }

  // 4. Send Free-Form Text (Inside 24-hour window)
  async sendTextMessage(client: Client, text: string, booking?: Booking): Promise<string | undefined> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: client.phoneNumber.replace('+', ''),
      type: 'text',
      text: { body: text },
    };

    const whatsappMessageId = await this.sendGraphApiMessage(payload);

    await this.messageLogService.logMessage({
      client,
      booking,
      direction: MessageDirection.OUTBOUND,
      messageType: MessageType.TEXT,
      content: text,
      whatsappMessageId,
    });

    return whatsappMessageId;
  }

  // 5. Send Template Message (Outside 24-hour window fallback)
  async sendTemplateMessage(
    client: Client,
    templateName: string,
    parameters: string[],
    booking?: Booking,
  ): Promise<string | undefined> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: client.phoneNumber.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };

    this.logger.log(
      `[24h Window Expired] Sending approved template "${templateName}" to ${client.phoneNumber}`,
    );

    const whatsappMessageId = await this.sendGraphApiMessage(payload);

    await this.messageLogService.logMessage({
      client,
      booking,
      direction: MessageDirection.OUTBOUND,
      messageType: MessageType.TEMPLATE,
      content: `[Template: ${templateName}] Params: ${parameters.join(', ')}`,
      whatsappMessageId,
    });

    return whatsappMessageId;
  }

  // 6. Interactive List Message
  async sendInteractiveList(
    client: Client,
    headerText: string,
    bodyText: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  ): Promise<string | undefined> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: client.phoneNumber.replace('+', ''),
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: headerText },
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections,
        },
      },
    };

    const whatsappMessageId = await this.sendGraphApiMessage(payload);

    await this.messageLogService.logMessage({
      client,
      direction: MessageDirection.OUTBOUND,
      messageType: MessageType.LIST,
      content: `[List: ${bodyText}]`,
      whatsappMessageId,
    });

    return whatsappMessageId;
  }

  // 6b. Interactive Button Message (Up to 3 Quick Action Buttons)
  async sendInteractiveButtons(
    client: Client,
    headerText: string | undefined,
    bodyText: string,
    buttons: { id: string; title: string }[],
    footerText?: string,
  ): Promise<string | undefined> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: client.phoneNumber.replace('+', ''),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title.substring(0, 20),
            },
          })),
        },
      },
    };

    if (headerText) {
      payload.interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      payload.interactive.footer = { text: footerText };
    }

    const whatsappMessageId = await this.sendGraphApiMessage(payload);

    await this.messageLogService.logMessage({
      client,
      direction: MessageDirection.OUTBOUND,
      messageType: MessageType.LIST,
      content: `[Buttons: ${bodyText}]`,
      whatsappMessageId,
    });

    return whatsappMessageId;
  }

  // 7. Business-initiated: Cancellation notice (24-hour window aware)
  async sendCancellationNotice(booking: Booking, reason: string) {
    const client = booking.client;
    const isFreeForm = await this.isWithin24HourWindow(client);

    const dateFormatted = new Date(booking.scheduledStart).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isFreeForm) {
      const msg = `Namaste ${client.name || ''}, your consultation booked for ${dateFormatted} has been cancelled. Reason: ${reason}. Please reply "book" if you wish to reschedule.`;
      return this.sendTextMessage(client, msg, booking);
    } else {
      // Outside 24h window: fall back to pre-approved template
      return this.sendTemplateMessage(
        client,
        'consultation_cancelled',
        [client.name || 'Client', dateFormatted, reason],
        booking,
      );
    }
  }

  // 8. Business-initiated: Running late status update (24-hour window aware)
  async sendStatusUpdate(client: Client, booking: Booking, updateText: string) {
    const isFreeForm = await this.isWithin24HourWindow(client);

    if (isFreeForm) {
      const msg = `Namaste ${client.name || ''}, update regarding your upcoming consultation: ${updateText}`;
      return this.sendTextMessage(client, msg, booking);
    } else {
      return this.sendTemplateMessage(
        client,
        'consultation_status_update',
        [client.name || 'Client', updateText],
        booking,
      );
    }
  }

  // 9. Inbound Webhook Processing & Conversational Booking Flow
  async handleInboundPayload(body: any) {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (!message) {
      return { status: 'no_message_to_process' };
    }

    const whatsappMessageId = message.id;
    const fromPhone = `+${message.from}`;

    // Dedup check against MessageLog
    const alreadyProcessed = await this.messageLogService.existsByWhatsappMessageId(whatsappMessageId);
    if (alreadyProcessed) {
      this.logger.log(`Duplicate WhatsApp webhook delivery ignored: ${whatsappMessageId}`);
      return { status: 'duplicate_ignored' };
    }

    // Resolve client
    const profileName = changes?.contacts?.[0]?.profile?.name;
    const client = await this.clientService.findOrCreate({
      phoneNumber: fromPhone,
      name: profileName || undefined,
    });

    let userText = '';
    let selectedReplyId = '';

    if (message.type === 'text') {
      userText = message.text?.body?.trim() || '';
    } else if (message.type === 'interactive') {
      if (message.interactive?.type === 'list_reply') {
        selectedReplyId = message.interactive.list_reply?.id || '';
        userText = message.interactive.list_reply?.title || '';
      } else if (message.interactive?.type === 'button_reply') {
        selectedReplyId = message.interactive.button_reply?.id || '';
        userText = message.interactive.button_reply?.title || '';
      }
    }

    // Log inbound message
    await this.messageLogService.logMessage({
      client,
      direction: MessageDirection.INBOUND,
      messageType: message.type === 'interactive' ? MessageType.LIST : MessageType.TEXT,
      content: userText || `[${message.type}]`,
      whatsappMessageId,
    });

    this.logger.log(`💬 Processing WhatsApp conversation for ${client.phoneNumber} with text: "${userText}" (replyId: "${selectedReplyId}")`);
    await this.processConversation(client, userText, selectedReplyId);
    return { status: 'processed' };
  }

  private async getConversationState(client: Client): Promise<ConversationState | undefined> {
    return this.conversationStates.get(client.phoneNumber);
  }

  private async setConversationState(client: Client, state: ConversationState) {
    this.conversationStates.set(client.phoneNumber, state);
  }

  private async clearConversationState(client: Client) {
    this.conversationStates.delete(client.phoneNumber);
  }

  private parseDateString(str: string): string | undefined {
    const clean = str.trim();
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
      const parts = clean.split(/[-/.]/);
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-/.]/);
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    return undefined;
  }

  private async processConversation(client: Client, text: string, replyId: string) {
    let state = await this.getConversationState(client);
    const lower = text.toLowerCase().trim();

    // Cancel / reset intent
    if (lower === 'cancel' || lower === 'reset' || replyId === 'btn_cancel') {
      await this.clearConversationState(client);
      await this.sendTextMessage(
        client,
        'Booking flow has been cancelled. Whenever you are ready to book an appointment, simply reply with "book".',
      );
      return;
    }

    // Handle quick action: Change Time / Reschedule existing booking
    if (replyId === 'btn_reschedule' || lower === 'change time' || lower === 'reschedule') {
      const upcoming = await this.bookingService.getUserUpcomingBookings(client.phoneNumber);
      if (upcoming.length > 0) {
        const targetBooking = upcoming[0];
        const nextState: ConversationState = {
          step: 'AWAITING_SLOT',
          rescheduleBookingId: targetBooking.id,
          adminId: targetBooking.admin?.id,
          sessionTypeId: targetBooking.sessionType?.id,
          serviceName: targetBooking.sessionType?.name,
          clientName: client.name,
          address: client.birthPlace,
        };
        await this.setConversationState(client, nextState);
        await this.presentAvailableSlots(
          client,
          nextState,
          'Select New Time',
          `Please pick your new preferred time slot for *${targetBooking.sessionType?.name}*:`,
        );
        return;
      }
    }

    // Handle quick action: Cancel existing booking from prompt
    if (replyId === 'btn_cancel_booking' || lower === 'cancel booking') {
      const upcoming = await this.bookingService.getUserUpcomingBookings(client.phoneNumber);
      if (upcoming.length > 0) {
        await this.bookingService.cancelBooking(upcoming[0].id, {
          cancelledReason: 'Cancelled by client via WhatsApp',
        });
        await this.clearConversationState(client);
        await this.sendTextMessage(
          client,
          'Your upcoming consultation has been cancelled. Whenever you wish to book again, simply reply "book". 🙏',
        );
        return;
      }
    }

    // Handle quick action: Book new day
    if (replyId === 'btn_book_new' || lower === 'book new' || lower === 'book new day') {
      await this.setConversationState(client, { step: 'AWAITING_SERVICE' });
      await this.sendInteractiveButtons(
        client,
        'Vedic Astrology Consultations',
        'Namaste! 🙏 Please select your consultation type:',
        [
          { id: 'srv_jata', title: '📜 Jata (जात)' },
          { id: 'srv_saiet', title: '⏳ Saiet (साइत)' },
        ],
        'Astrologer Booking System',
      );
      return;
    }

    // Step 1: Start booking -> Choose "Jata" (जात) or "Saiet" (साइत)
    if (
      lower === 'book' ||
      lower.includes('schedule') ||
      lower.includes('appointment') ||
      lower === 'start' ||
      (!state && (lower.includes('hi') || lower.includes('hello') || lower.includes('namaste') || lower.includes('book')))
    ) {
      // Check if client already has an active upcoming booking
      const upcoming = await this.bookingService.getUserUpcomingBookings(client.phoneNumber);
      if (upcoming.length > 0) {
        const nextBooking = upcoming[0];
        const admin = nextBooking.admin?.id
          ? await this.adminService.getAdminProfile(nextBooking.admin.id).catch(() => null)
          : null;
        const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';
        const dateStr = formatInTimeZone(new Date(nextBooking.scheduledStart), timeZone, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = formatInTimeZone(new Date(nextBooking.scheduledStart), timeZone, {
          hour: '2-digit',
          minute: '2-digit',
        });

        await this.setConversationState(client, {
          step: 'AWAITING_SERVICE',
          rescheduleBookingId: nextBooking.id,
          adminId: nextBooking.admin?.id,
          sessionTypeId: nextBooking.sessionType?.id,
          serviceName: nextBooking.sessionType?.name,
        });

        const clientName = client.name || 'Client';
        await this.sendInteractiveButtons(
          client,
          'Active Consultation',
          `Namaste ${clientName}! 🙏\n\nYou currently have an upcoming consultation:\n\n` +
            `📌 *Service:* ${nextBooking.sessionType?.name}\n` +
            `📅 *Date:* ${dateStr}\n` +
            `⏰ *Time:* ${timeStr}\n\n` +
            `What would you like to do?`,
          [
            { id: 'btn_reschedule', title: '🔄 Change Time' },
            { id: 'btn_book_new', title: '📅 Book New Day' },
            { id: 'btn_cancel_booking', title: '❌ Cancel Booking' },
          ],
          'Astrologer Booking System',
        );
        return;
      }

      await this.setConversationState(client, { step: 'AWAITING_SERVICE' });

      await this.sendInteractiveButtons(
        client,
        'Vedic Astrology Consultations',
        'Namaste! 🙏 Welcome to Vedic Astrology Consultation.\n\nPlease select your consultation type:',
        [
          { id: 'srv_jata', title: '📜 Jata (जात)' },
          { id: 'srv_saiet', title: '⏳ Saiet (साइत)' },
        ],
        'Astrologer Booking System',
      );
      return;
    }

    if (!state) {
      await this.sendTextMessage(
        client,
        'Namaste! 🙏 Welcome to Astrologer Consultation.\n\nReply with *book* to schedule an appointment.',
      );
      return;
    }

    // Handle Step 1 Response: Service Type Selection
    if (state.step === 'AWAITING_SERVICE') {
      const isJata = replyId === 'srv_jata' || lower.includes('jata') || lower.includes('जात') || lower === '1';
      const isSaiet = replyId === 'srv_saiet' || lower.includes('saiet') || lower.includes('साइत') || lower === '2';

      if (!isJata && !isSaiet) {
        await this.sendInteractiveButtons(
          client,
          'Select Consultation',
          'Please choose either *Jata (जात)* or *Saiet (साइत)* to continue:',
          [
            { id: 'srv_jata', title: '📜 Jata (जात)' },
            { id: 'srv_saiet', title: '⏳ Saiet (साइत)' },
          ],
        );
        return;
      }

      const allSessionTypes = await this.sessionTypeService.getAll();
      const targetName = isJata ? 'jata' : 'saiet';
      const sessionType =
        allSessionTypes.find((st) => st.name.toLowerCase().includes(targetName)) ||
        allSessionTypes[0];

      if (!sessionType) {
        await this.sendTextMessage(
          client,
          'No consultation session types configured. Please contact the administrator.',
        );
        await this.clearConversationState(client);
        return;
      }

      state.serviceType = isJata ? 'JATA' : 'SAIET';
      state.serviceName = isJata ? 'Jata (जात - जन्म कुण्डली)' : 'Saiet (साइत - शुभ मुहूर्त)';
      state.sessionTypeId = sessionType.id;
      let adminId = sessionType.admin?.id || allSessionTypes.find((st) => st.admin?.id)?.admin?.id;
      if (!adminId) {
        const defaultAdmin = await this.adminService.getDefaultAdmin();
        adminId = defaultAdmin?.id;
      }
      state.adminId = adminId;
      state.step = 'AWAITING_QUANTITY';
      await this.setConversationState(client, state);

      // Step 2: Ask quantity (1 or 2 with pricing, max 2)
      await this.sendInteractiveButtons(
        client,
        'Consultation Quantity',
        `How many *${state.serviceName}* would you like to consult? (Maximum 2 per session)\n\n• *1 ${isJata ? 'Kundali' : 'Saiet'}* — Rs. 500\n• *2 ${isJata ? 'Kundalis' : 'Saiet'}* — Rs. 1,000`,
        [
          { id: 'qty_1', title: '1 (Rs. 500)' },
          { id: 'qty_2', title: '2 (Rs. 1,000)' },
        ],
        'Maximum 2 per session',
      );
      return;
    }

    // Handle Step 2 Response: Quantity Selection (1 or 2, max 2)
    if (state.step === 'AWAITING_QUANTITY') {
      let qty: number | undefined;

      if (replyId === 'qty_1' || lower === '1' || lower === 'one' || lower === 'ek') {
        qty = 1;
      } else if (replyId === 'qty_2' || lower === '2' || lower === 'two' || lower === 'dui') {
        qty = 2;
      } else {
        const numMatch = lower.match(/\d+/);
        if (numMatch) {
          const parsedNum = parseInt(numMatch[0], 10);
          if (parsedNum >= 3) {
            await this.sendInteractiveButtons(
              client,
              'Limit Exceeded',
              `⚠️ The Acharya reviews a maximum of *2 ${state.serviceName || 'consultations'}* per session.\n\nRequests for 3 or more cannot be accepted in a single session. Please choose 1 or 2:`,
              [
                { id: 'qty_1', title: '1 (Rs. 500)' },
                { id: 'qty_2', title: '2 (Rs. 1,000)' },
              ],
            );
            return;
          }
          if (parsedNum === 1 || parsedNum === 2) {
            qty = parsedNum;
          }
        }
      }

      if (!qty) {
        await this.sendInteractiveButtons(
          client,
          'Select Quantity',
          `Please select *1* or *2* ${state.serviceName || 'consultations'}:`,
          [
            { id: 'qty_1', title: '1 (Rs. 500)' },
            { id: 'qty_2', title: '2 (Rs. 1,000)' },
          ],
        );
        return;
      }

      state.quantity = qty;
      state.totalPrice = qty * 500;

      // Step 3: Find and show open time slots
      const slotsPresented = await this.presentAvailableSlots(client, state);
      if (!slotsPresented) {
        await this.clearConversationState(client);
      }
      return;
    }

    // Handle Step 3 Response: Slot Selected
    if (state.step === 'AWAITING_SLOT') {
      if (!replyId.startsWith('slot_')) {
        await this.sendTextMessage(
          client,
          'Please pick a time slot from the list above 👆 (or reply *cancel* to restart).',
        );
        return;
      }

      const slotStart = decodeURIComponent(replyId.replace('slot_', ''));

      // Validate slot availability immediately
      const isAvailable = await this.availabilityService.isSlotAvailable(
        state.adminId!,
        state.sessionTypeId!,
        slotStart,
      );

      if (!isAvailable) {
        await this.sendTextMessage(
          client,
          '⚠️ *Slot Unavailable*: That time slot was just taken by another client or is no longer available.',
        );
        await this.presentAvailableSlots(
          client,
          state,
          'Choose Another Slot',
          'Please select another available time slot below to continue:',
        );
        return;
      }

      // Case A: If client is in dedicated reschedule mode for an existing booking
      if (state.rescheduleBookingId) {
        try {
          const rescheduled = await this.bookingService.rescheduleBooking(
            state.rescheduleBookingId,
            slotStart,
          );

          const admin = state.adminId
            ? await this.adminService.getAdminProfile(state.adminId).catch(() => null)
            : null;
          const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';
          const newStart = new Date(rescheduled.scheduledStart);
          const newDateStr = formatInTimeZone(newStart, timeZone, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const newTimeStr = formatInTimeZone(newStart, timeZone, {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.sendTextMessage(
            client,
            `🎉 *Appointment Rescheduled!* 🎉\n\n` +
              `Your consultation has been successfully moved to:\n` +
              `📅 *Date:* ${newDateStr}\n` +
              `⏰ *New Time:* ${newTimeStr}\n` +
              `📌 *Service:* ${state.serviceName || rescheduled.sessionType?.name}\n\n` +
              `We look forward to seeing you at your new time! 🙏`,
            rescheduled,
          );
          await this.clearConversationState(client);
          return;
        } catch (err: any) {
          await this.sendTextMessage(
            client,
            '⚠️ Could not reschedule to that slot. Please select another time slot:',
          );
          await this.presentAvailableSlots(client, state, 'Select Another Slot');
          return;
        }
      }

      // Case B: Same-Day Double Booking Prevention
      const admin = state.adminId
        ? await this.adminService.getAdminProfile(state.adminId).catch(() => null)
        : null;
      const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';
      const slotDate = new Date(slotStart);
      const targetDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(slotDate);

      const existingBookingOnDay = await this.bookingService.getClientBookingOnDate(
        client.id,
        targetDateStr,
        timeZone,
      );

      if (existingBookingOnDay && existingBookingOnDay.id !== state.rescheduleBookingId) {
        const existingStart = new Date(existingBookingOnDay.scheduledStart);
        const existingTimeFormatted = formatInTimeZone(existingStart, timeZone, {
          hour: '2-digit',
          minute: '2-digit',
        });
        const newTimeFormatted = formatInTimeZone(slotDate, timeZone, {
          hour: '2-digit',
          minute: '2-digit',
        });
        const dateFormatted = formatInTimeZone(slotDate, timeZone, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

        state.step = 'AWAITING_SAME_DAY_CHOICE';
        state.selectedSlot = slotStart;
        state.existingBookingIdOnDay = existingBookingOnDay.id;
        await this.setConversationState(client, state);

        await this.sendInteractiveButtons(
          client,
          'Same-Day Booking Notice',
          `⚠️ You already have an appointment on ${dateFormatted}:\n\n` +
            `⏰ *Current Time:* ${existingTimeFormatted}\n` +
            `📌 *Service:* ${existingBookingOnDay.sessionType?.name}\n\n` +
            `To maintain the best consultation quality, we limit bookings to 1 session per client per day.\n\n` +
            `Would you like to move your appointment to *${newTimeFormatted}* instead?`,
          [
            { id: 'btn_same_day_reschedule', title: `🔄 Move to ${newTimeFormatted}`.substring(0, 20) },
            { id: 'btn_same_day_keep', title: `Keep ${existingTimeFormatted}`.substring(0, 20) },
          ],
          '1 session per day policy',
        );
        return;
      }

      state.selectedSlot = slotStart;

      // Auto-prefill if client name and address already exist on profile or in state
      const knownName = state.clientName || client.name;
      const knownAddress = state.address || client.birthPlace;

      if (knownName && knownAddress) {
        state.clientName = knownName;
        state.address = knownAddress;
        return this.showBookingSummaryAndConfirm(client, state);
      }

      state.step = 'AWAITING_NAME_ADDRESS';
      await this.setConversationState(client, state);

      // Step 4: Ask Full Name and Address (Second to last step)
      await this.sendTextMessage(
        client,
        '✨ *Slot Reserved!*\n\nPlease reply with your:\n*Full Name and Address*\n(e.g., Kirti Kirtan Joshi, Jwagal)',
      );
      return;
    }

    // Handle Step 4 Response: Name and Address Received
    if (state.step === 'AWAITING_NAME_ADDRESS') {
      const parts = text.split(/,|\n/).map((s) => s.trim()).filter(Boolean);
      const name = parts[0] || client.name || 'Client';
      const address = parts.slice(1).join(', ').trim() || 'Kathmandu';

      state.clientName = name;
      state.address = address;

      // Immediately persist customer details to database so they are never lost
      await this.clientService.update(client.id, {
        name,
        birthPlace: address,
      });

      // Step 5: Last step - Summary with Confirmation
      return this.showBookingSummaryAndConfirm(client, state);
    }

    // Handle Step 5 Response: Confirmation Card Action
    if (state.step === 'AWAITING_CONFIRMATION') {
      if (
        replyId === 'btn_confirm' ||
        lower.includes('confirm') ||
        lower.includes('yes') ||
        lower === 'ok'
      ) {
        return this.executeConfirmedBooking(client, state);
      } else if (
        replyId === 'btn_edit_details' ||
        lower === 'edit' ||
        lower === 'update' ||
        lower.includes('change')
      ) {
        state.step = 'AWAITING_NAME_ADDRESS';
        await this.setConversationState(client, state);
        await this.sendTextMessage(
          client,
          'Please reply with your updated:\n*Full Name and Address*\n(e.g., Kirti Kirtan Joshi, Jwagal)',
        );
        return;
      } else if (replyId === 'btn_cancel' || lower.includes('cancel')) {
        await this.clearConversationState(client);
        await this.sendTextMessage(
          client,
          'Booking has been cancelled. Whenever you are ready, reply with "book".',
        );
        return;
      } else {
        await this.sendTextMessage(
          client,
          'Please tap *Confirm Booking* below, tap *Update Details* to change your info, or reply *cancel* to restart.',
        );
        return;
      }
    }

    // Handle Step: Same-Day Double Booking Choice Response
    if (state.step === 'AWAITING_SAME_DAY_CHOICE') {
      if (
        replyId === 'btn_same_day_reschedule' ||
        lower.includes('move') ||
        lower.includes('reschedule') ||
        lower.includes('yes')
      ) {
        try {
          const rescheduled = await this.bookingService.rescheduleBooking(
            state.existingBookingIdOnDay!,
            state.selectedSlot!,
          );

          const admin = state.adminId
            ? await this.adminService.getAdminProfile(state.adminId).catch(() => null)
            : null;
          const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';
          const newStart = new Date(rescheduled.scheduledStart);
          const newDateStr = formatInTimeZone(newStart, timeZone, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const newTimeStr = formatInTimeZone(newStart, timeZone, {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.sendTextMessage(
            client,
            `🎉 *Appointment Rescheduled!* 🎉\n\n` +
              `Your consultation on ${newDateStr} has been successfully moved to:\n` +
              `⏰ *New Time:* ${newTimeStr}\n` +
              `📌 *Service:* ${rescheduled.sessionType?.name}\n\n` +
              `We look forward to seeing you at your new time! 🙏`,
            rescheduled,
          );
          await this.clearConversationState(client);
          return;
        } catch (err: any) {
          await this.sendTextMessage(
            client,
            '⚠️ Could not reschedule to that slot. Please reply "book" to view available slots.',
          );
          await this.clearConversationState(client);
          return;
        }
      } else {
        await this.clearConversationState(client);
        await this.sendTextMessage(
          client,
          'Got it! Your existing appointment remains confirmed. Reply "book" whenever you need help. 🙏',
        );
        return;
      }
    }
  }

  private async presentAvailableSlots(
    client: Client,
    state: ConversationState,
    headerText: string = 'Choose Time Slot',
    introText?: string,
  ): Promise<boolean> {
    const admin = state.adminId
      ? await this.adminService.getAdminProfile(state.adminId).catch(() => null)
      : null;
    const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';

    let targetDateStr = '';
    let targetSlots: any[] = [];

    for (let offset = 0; offset < 7; offset++) {
      const checkDate = getLocalDateString(offset, timeZone);
      const slots = await this.availabilityService.getAvailability(
        state.adminId!,
        checkDate,
        state.sessionTypeId!,
      );

      const validSlots = offset === 0
        ? slots.filter((s) => new Date(s.start).getTime() > Date.now())
        : slots;

      if (validSlots.length > 0) {
        targetDateStr = checkDate;
        targetSlots = validSlots;
        break;
      }
    }

    if (targetSlots.length === 0) {
      await this.sendTextMessage(
        client,
        `There are currently no open slots in the upcoming week for "${state.serviceName}". Please contact admin or try another session.`,
      );
      return false;
    }

    state.step = 'AWAITING_SLOT';
    await this.setConversationState(client, state);

    const todayDateStr = getLocalDateString(0, timeZone);
    const isToday = targetDateStr === todayDateStr;
    const formattedDate = formatInTimeZone(
      new Date(`${targetDateStr}T12:00:00Z`),
      timeZone,
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      },
    );

    const slotRows = targetSlots.slice(0, 10).map((s) => ({
      id: `slot_${encodeURIComponent(s.start)}`,
      title: s.displayTime.substring(0, 24),
      description: isToday ? 'Today' : formattedDate,
    }));

    const bodyText =
      introText ||
      `Available openings on ${formattedDate} for ${state.serviceName} (${state.quantity}x — Rs. ${state.totalPrice}):`;

    await this.sendInteractiveList(
      client,
      headerText,
      bodyText,
      'Pick a Time',
      [{ title: `Openings (${formattedDate})`, rows: slotRows }],
    );

    return true;
  }

  private async showBookingSummaryAndConfirm(
    client: Client,
    state: ConversationState,
  ) {
    state.step = 'AWAITING_CONFIRMATION';
    await this.setConversationState(client, state);

    const admin = state.adminId
      ? await this.adminService.getAdminProfile(state.adminId).catch(() => null)
      : null;
    const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';

    const slotDate = new Date(state.selectedSlot!);
    const dateStr = formatInTimeZone(slotDate, timeZone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const startLocal = formatInTimeZone(slotDate, timeZone, {
      hour: '2-digit',
      minute: '2-digit',
    });

    const summaryText =
      `📋 *Please confirm your consultation details:*\n\n` +
      `*Service:* ${state.serviceName || 'Consultation'}\n` +
      `*Quantity:* ${state.quantity || 1}\n` +
      `*Total Fee:* Rs. ${state.totalPrice || 500}\n` +
      `*Date:* ${dateStr}\n` +
      `*Time:* ${startLocal}\n` +
      `*Client Name:* ${state.clientName || 'Client'}\n` +
       `*Address:* ${state.address || 'Not provided'}\n\n` +
      `Tap *Confirm Booking* below to lock in your appointment!`;

    await this.sendInteractiveButtons(
      client,
      'Consultation Summary',
      summaryText,
      [
        { id: 'btn_confirm', title: '✅ Confirm Booking' },
        { id: 'btn_edit_details', title: '✏️ Update Details' },
        { id: 'btn_cancel', title: '❌ Cancel' },
      ],
      'Astrologer Booking System',
    );
  }

  private async executeConfirmedBooking(
    client: Client,
    state: ConversationState,
  ) {
    const name = state.clientName || client.name || 'Client';
    const address = state.address || undefined;

    // Update client profile in DB
    await this.clientService.update(client.id, {
      name,
      birthPlace: address,
    });

    // Call backend POST /bookings transactionally
    try {
      const booking = await this.bookingService.createBooking({
        adminId: state.adminId!,
        sessionTypeId: state.sessionTypeId!,
        scheduledStart: state.selectedSlot!,
        source: BookingSource.WHATSAPP,
        clientId: client.id,
        notes: `Service: ${state.serviceName} | Quantity: ${state.quantity}x | Fee: Rs. ${state.totalPrice} | Address: ${address || 'Not provided'}`,
      });

      const admin = state.adminId
        ? await this.adminService.getAdminProfile(state.adminId).catch(() => null)
        : null;
      const timeZone = (admin as any)?.timezone || 'Asia/Kathmandu';

      const slotDate = new Date(booking.scheduledStart);
      const dateStr = formatInTimeZone(slotDate, timeZone, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const startLocal = formatInTimeZone(slotDate, timeZone, {
        hour: '2-digit',
        minute: '2-digit',
      });

      await this.sendTextMessage(
        client,
        ` *Booking Confirmed!* \n\n` +
          `📌 *Service:* ${state.serviceName} (${state.quantity}x)\n` +
          `💰 *Total Fee:* Rs. ${state.totalPrice}\n` +
          `📅 *Date:* ${dateStr}\n` +
          `⏰ *Time:* ${startLocal}\n` +
          `👤 *Client Name:* ${name}\n` +
          `📍 *Address:* ${address || 'Not provided'}\n\n` +
          `Your appointment is officially booked and locked into the schedule. We look forward to seeing you! 🙏`,
        booking,
      );
      await this.clearConversationState(client);
    } catch (err: any) {
      this.logger.warn(`Booking execution conflict/error: ${err.message}`);
      await this.sendTextMessage(
        client,
        '⚠️ *Slot Unavailable*: That time slot was just taken by another client while confirming.',
      );
      // Keep client name and address in state, switch back to AWAITING_SLOT
      state.selectedSlot = undefined;
      state.step = 'AWAITING_SLOT';
      await this.setConversationState(client, state);
      await this.presentAvailableSlots(
        client,
        state,
        'Choose Another Slot',
        'Please select another available time slot below to complete your booking:',
      );
    }
  }
}

