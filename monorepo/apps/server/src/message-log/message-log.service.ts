import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog } from './entities/message-log.entity';
import { Client } from '../client/entities/client.entity';
import { Booking } from '../booking/entities/booking.entity';
import { MessageDirection, MessageType } from '../common/enums';

@Injectable()
export class MessageLogService {
  constructor(
    @InjectRepository(MessageLog)
    private readonly messageLogRepo: Repository<MessageLog>,
  ) {}

  async logMessage(params: {
    client: Client;
    booking?: Booking;
    direction: MessageDirection;
    messageType: MessageType;
    content: string;
    whatsappMessageId?: string;
  }): Promise<MessageLog> {
    const log = this.messageLogRepo.create({
      client: params.client,
      booking: params.booking,
      direction: params.direction,
      messageType: params.messageType,
      content: params.content,
      whatsappMessageId: params.whatsappMessageId,
    });

    return this.messageLogRepo.save(log);
  }

  async existsByWhatsappMessageId(whatsappMessageId: string): Promise<boolean> {
    if (!whatsappMessageId) return false;
    const count = await this.messageLogRepo.count({
      where: { whatsappMessageId },
    });
    return count > 0;
  }

  async getLastInboundMessageDate(clientId: string): Promise<Date | null> {
    const lastInbound = await this.messageLogRepo.findOne({
      where: {
        client: { id: clientId },
        direction: MessageDirection.INBOUND,
      },
      order: { createdAt: 'DESC' },
    });

    return lastInbound ? lastInbound.createdAt : null;
  }
}
