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

interface ConversationState {
  step:
    | 'AWAITING_SERVICE'
    | 'AWAITING_QUANTITY'
    | 'AWAITING_SLOT'
    | 'AWAITING_NAME_ADDRESS'
    | 'AWAITING_CONFIRMATION';
  serviceType?: 'JATA' | 'SAIET';
  serviceName?: string;
  quantity?: number;
  totalPrice?: number;
  sessionTypeId?: string;
  selectedSlot?: string;
  adminId?: string;
  clientName?: string;
  address?: string;
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
        const admin = await this.adminService.getAdminProfile(adminId) as any;
        if (admin?.whatsappPhoneNumberId && admin?.whatsappAccessToken) {
          phoneNumberId = admin.whatsappPhoneNumberId;
          accessToken = admin.whatsappAccessToken;
        }
      } catch (err: any) {
        this.logger.warn(`Could not load custom WhatsApp credentials for admin ${adminId}: ${err.message}`);
      }
    }

    if (!phoneNumberId || !accessToken) {
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
    const client = await this.clientService.findOrCreate({ phoneNumber: fromPhone });

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
    const memState = this.conversationStates.get(client.phoneNumber);
    if (memState) return memState;

    if (client.notes && client.notes.startsWith('__CONV_STATE__:')) {
      try {
        const state = JSON.parse(client.notes.replace('__CONV_STATE__:', ''));
        this.conversationStates.set(client.phoneNumber, state);
        return state;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private async setConversationState(client: Client, state: ConversationState) {
    this.conversationStates.set(client.phoneNumber, state);
    try {
      await this.clientService.update(client.id, {
        notes: `__CONV_STATE__:${JSON.stringify(state)}`,
      });
    } catch (err: any) {
      this.logger.warn(`Could not persist conversation state: ${err.message}`);
    }
  }

  private async clearConversationState(client: Client) {
    this.conversationStates.delete(client.phoneNumber);
    try {
      await this.clientService.update(client.id, { notes: undefined });
    } catch (err: any) {
      this.logger.warn(`Could not clear conversation state: ${err.message}`);
    }
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

    // Step 1: Start booking -> Choose "Jata" (जात) or "Saiet" (साइत)
    if (
      lower === 'book' ||
      lower.includes('schedule') ||
      lower.includes('appointment') ||
      lower === 'start' ||
      (!state && (lower.includes('hi') || lower.includes('hello') || lower.includes('namaste') || lower.includes('book')))
    ) {
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
      state.adminId = sessionType.admin?.id || allSessionTypes[0]?.admin?.id;
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
      let targetDateStr = '';
      let targetSlots: any[] = [];

      for (let offset = 0; offset < 7; offset++) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        const checkDate = d.toISOString().split('T')[0];
        const slots = await this.availabilityService.getAvailability(state.adminId!, checkDate, state.sessionTypeId!);

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
        await this.clearConversationState(client);
        return;
      }

      state.step = 'AWAITING_SLOT';
      await this.setConversationState(client, state);

      const isToday = targetDateStr === new Date().toISOString().split('T')[0];
      const formattedDate = new Date(`${targetDateStr}T00:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const slotRows = targetSlots.slice(0, 10).map((s) => ({
        id: `slot_${encodeURIComponent(s.start)}`,
        title: s.displayTime.substring(0, 24),
        description: isToday ? 'Today' : formattedDate,
      }));

      await this.sendInteractiveList(
        client,
        'Choose Time Slot',
        `Available openings on ${formattedDate} for ${state.serviceName} (${state.quantity}x — Rs. ${state.totalPrice}):`,
        'Pick a Time',
        [{ title: `Openings (${formattedDate})`, rows: slotRows }],
      );
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
      state.selectedSlot = slotStart;
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
          'Please tap *Confirm Booking* below or reply *confirm* to finalize your appointment, or reply *cancel* to restart.',
        );
        return;
      }
    }
  }

  private async showBookingSummaryAndConfirm(
    client: Client,
    state: ConversationState,
  ) {
    state.step = 'AWAITING_CONFIRMATION';
    await this.setConversationState(client, state);

    const dateStr = new Date(state.selectedSlot!).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const startLocal = new Date(state.selectedSlot!).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const summaryText =
      `📋 *Please confirm your consultation details:*\n\n` +
      `📌 *Service:* ${state.serviceName || 'Consultation'}\n` +
      `🔢 *Quantity:* ${state.quantity || 1}\n` +
      `💰 *Total Fee:* Rs. ${state.totalPrice || 500}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `⏰ *Time:* ${startLocal}\n` +
      `👤 *Client Name:* ${state.clientName || 'Client'}\n` +
      `📍 *Address:* ${state.address || 'Not provided'}\n\n` +
      `Tap *Confirm Booking* below to lock in your appointment!`;

    await this.sendInteractiveButtons(
      client,
      'Consultation Summary',
      summaryText,
      [
        { id: 'btn_confirm', title: '✅ Confirm Booking' },
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

      const dateStr = new Date(booking.scheduledStart).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const startLocal = new Date(booking.scheduledStart).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await this.sendTextMessage(
        client,
        `🎉 *Booking Confirmed!* 🎉\n\n` +
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
      // Slot overlap or constraint error
      await this.sendTextMessage(
        client,
        '⚠️ *Slot Unavailable*: That time slot was just taken by another client. Please reply "book" to pick another available slot.',
      );
      await this.clearConversationState(client);
    }
  }
}

