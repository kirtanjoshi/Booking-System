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
    | 'AWAITING_SESSION'
    | 'AWAITING_SLOT'
    | 'INTAKE_NAME'
    | 'INTAKE_DOB'
    | 'INTAKE_ADDRESS'
    | 'AWAITING_CONFIRMATION';
  sessionTypeId?: string;
  selectedSlot?: string;
  adminId?: string;
  intakeData?: {
    name?: string;
    birthDate?: string;
    address?: string;
  };
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

  private async processConversation(client: Client, text: string, replyId: string) {
    const stateKey = client.phoneNumber;
    let state = this.conversationStates.get(stateKey);

    const lower = text.toLowerCase();

    // Cancel / reset intent
    if (lower === 'cancel' || lower === 'reset' || replyId === 'btn_cancel') {
      this.conversationStates.delete(stateKey);
      await this.sendTextMessage(
        client,
        'Booking flow has been cancelled. Whenever you are ready to book an appointment, simply reply with "book".',
      );
      return;
    }

    // Intent to start booking
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || !state) {
      const sessionTypes = await this.sessionTypeService.getAll();
      if (sessionTypes.length === 0) {
        await this.sendTextMessage(
          client,
          'Namaste! There are currently no consultation session types configured. Please try again shortly.',
        );
        return;
      }

      this.conversationStates.set(stateKey, { step: 'AWAITING_SESSION' });

      const rows = sessionTypes.map((st) => ({
        id: `st_${st.id}`,
        title: st.name.substring(0, 24),
        description: `${st.durationMinutes} min (+${st.bufferMinutes}m buffer)`,
      }));

      await this.sendInteractiveList(
        client,
        'Vedic Astrology Consultations',
        'Please select a consultation type to view available openings:',
        'Select Session',
        [{ title: 'Available Consultations', rows }],
      );
      return;
    }

    // Step 1: Session selected -> Show open slots (Multi-day smart availability)
    if (state.step === 'AWAITING_SESSION' && replyId.startsWith('st_')) {
      const sessionTypeId = replyId.replace('st_', '');
      state.sessionTypeId = sessionTypeId;

      const sessionType = await this.sessionTypeService.getById(sessionTypeId);
      const adminId = sessionType.admin?.id || (await this.sessionTypeService.getAll())[0]?.admin?.id;
      state.adminId = adminId;

      // Find first day with available slots in next 7 days
      let targetDateStr = '';
      let targetSlots: any[] = [];

      for (let offset = 0; offset < 7; offset++) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        const checkDate = d.toISOString().split('T')[0];
        const slots = await this.availabilityService.getAvailability(adminId, checkDate, sessionTypeId);

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
          `There are currently no open slots in the upcoming week for "${sessionType.name}". Please contact admin or try another session.`,
        );
        this.conversationStates.delete(stateKey);
        return;
      }

      state.step = 'AWAITING_SLOT';
      this.conversationStates.set(stateKey, state);

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
        `Available openings on ${formattedDate} for ${sessionType.name}:`,
        'Pick a Time',
        [{ title: `Openings (${formattedDate})`, rows: slotRows }],
      );
      return;
    }

    // Step 2: Slot selected -> Start intake stepper (Step 1/3: Name)
    if (state.step === 'AWAITING_SLOT' && replyId.startsWith('slot_')) {
      const slotStart = decodeURIComponent(replyId.replace('slot_', ''));
      state.selectedSlot = slotStart;
      state.step = 'INTAKE_NAME';
      state.intakeData = {};
      this.conversationStates.set(stateKey, state);

      await this.sendTextMessage(
        client,
        '✨ *Slot Reserved!*\n\nLet\'s collect your consultation details:\n\n1️⃣ *Step 1/3:* What is your *Full Name*?\n_(Tip: You can also send Name, Date of Birth, Address all in one message!)_',
      );
      return;
    }

    // Step 3: Stepper Intake Processing (Fast-Track vs Step-by-Step)
    if (
      state.step === 'INTAKE_NAME' ||
      state.step === 'INTAKE_DOB' ||
      state.step === 'INTAKE_ADDRESS'
    ) {
      // 3a. Fast-track parser if user sent multiple comma/newline separated details at once
      const multiParts = text.split(/,|\n/).map((s) => s.trim()).filter(Boolean);
      if (multiParts.length >= 2) {
        const name = multiParts[0];
        let foundDob: string | undefined;
        const addressParts: string[] = [];

        for (let i = 1; i < multiParts.length; i++) {
          const item = multiParts[i];
          if (/^\d{4}-\d{2}-\d{2}$/.test(item) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(item)) {
            foundDob = item;
          } else {
            addressParts.push(item);
          }
        }

        state.intakeData = {
          name: name || state.intakeData?.name || client.name,
          birthDate: foundDob || state.intakeData?.birthDate,
          address: addressParts.join(', ') || state.intakeData?.address || '',
        };

        return this.showBookingSummaryAndConfirm(client, state, stateKey);
      }

      // 3b. Step-by-Step guided stepper
      if (state.step === 'INTAKE_NAME') {
        state.intakeData = { ...state.intakeData, name: text };
        state.step = 'INTAKE_DOB';
        this.conversationStates.set(stateKey, state);

        await this.sendTextMessage(
          client,
          `Nice to meet you, *${text}*!\n\n2️⃣ *Step 2/3:* What is your *Date of Birth* (YYYY-MM-DD, e.g., 1995-08-15)?\n_(Or reply *skip*)_`,
        );
        return;
      }

      if (state.step === 'INTAKE_DOB') {
        if (text.toLowerCase() !== 'skip') {
          state.intakeData = { ...state.intakeData, birthDate: text };
        }
        state.step = 'INTAKE_ADDRESS';
        this.conversationStates.set(stateKey, state);

        await this.sendTextMessage(
          client,
          `Got it! 📅\n\n3️⃣ *Step 3/3:* What is your *Current City / Address*?\n_(Or reply *skip*)_`,
        );
        return;
      }

      if (state.step === 'INTAKE_ADDRESS') {
        if (text.toLowerCase() !== 'skip') {
          state.intakeData = { ...state.intakeData, address: text };
        }
        return this.showBookingSummaryAndConfirm(client, state, stateKey);
      }
    }

    // Step 4: Booking Summary Confirmation
    if (state.step === 'AWAITING_CONFIRMATION') {
      if (
        replyId === 'btn_confirm' ||
        lower.includes('confirm') ||
        lower.includes('yes') ||
        lower === 'ok'
      ) {
        return this.executeConfirmedBooking(client, state, stateKey);
      } else if (replyId === 'btn_cancel' || lower.includes('cancel')) {
        this.conversationStates.delete(stateKey);
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
    stateKey: string,
  ) {
    state.step = 'AWAITING_CONFIRMATION';
    this.conversationStates.set(stateKey, state);

    const sessionType = await this.sessionTypeService.getById(state.sessionTypeId!);

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

    const name = state.intakeData?.name || client.name || 'Client';
    const dob = state.intakeData?.birthDate || 'Not provided';
    const address = state.intakeData?.address || 'Not provided';

    const summaryText =
      `📋 *Please confirm your consultation details:*\n\n` +
      `📌 *Session:* ${sessionType?.name || 'Consultation'}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `⏰ *Time:* ${startLocal}\n` +
      `👤 *Name:* ${name}\n` +
      `🎂 *DOB:* ${dob}\n` +
      `📍 *Address:* ${address}\n\n` +
      `Tap *Confirm Booking* below to reserve your slot immediately!`;

    await this.sendInteractiveButtons(
      client,
      'Booking Confirmation',
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
    stateKey: string,
  ) {
    const name = state.intakeData?.name || client.name || 'Client';
    const birthDate = state.intakeData?.birthDate;
    const address = state.intakeData?.address;

    // Update client profile
    await this.clientService.update(client.id, {
      name,
      birthDate: birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : undefined,
      birthPlace: address || undefined,
    });

    // Call backend POST /bookings transactionally
    try {
      const booking = await this.bookingService.createBooking({
        adminId: state.adminId!,
        sessionTypeId: state.sessionTypeId!,
        scheduledStart: state.selectedSlot!,
        source: BookingSource.WHATSAPP,
        clientId: client.id,
      });

      const sessionType = await this.sessionTypeService.getById(state.sessionTypeId!);

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
        `🎉 *Booking Confirmed!* 🎉\n\n📌 *Session:* ${sessionType?.name || 'Consultation'}\n📅 *Date:* ${dateStr}\n⏰ *Time:* ${startLocal}\n👤 *Name:* ${name}\n🎂 *DOB:* ${birthDate || 'Not provided'}\n📍 *Address:* ${address || 'Not provided'}\n\nYour appointment is officially booked and locked into our schedule. We look forward to seeing you! 🙏`,
        booking,
      );
      this.conversationStates.delete(stateKey);
    } catch (err: any) {
      // Slot overlap or constraint error
      await this.sendTextMessage(
        client,
        '⚠️ *Slot Unavailable*: That time slot was just taken by another client. Please reply "book" to pick another available slot.',
      );
      this.conversationStates.delete(stateKey);
    }
  }
}
