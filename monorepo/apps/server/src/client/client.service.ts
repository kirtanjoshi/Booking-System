import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async getAll(): Promise<Client[]> {
    return this.clientRepo.find({
      relations: ['bookings', 'bookings.sessionType'],
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: string): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id },
      relations: ['bookings', 'bookings.sessionType', 'messages'],
    });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client;
  }

  async findOrCreate(dto: CreateClientDto): Promise<Client> {
    let client = await this.clientRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (client) {
      if (dto.name && !client.name) client.name = dto.name;
      if (dto.birthDate && !client.birthDate) client.birthDate = dto.birthDate;
      if (dto.birthTime && !client.birthTime) client.birthTime = dto.birthTime;
      if (dto.birthPlace && !client.birthPlace) client.birthPlace = dto.birthPlace;
      if (dto.notes && !client.notes) client.notes = dto.notes;
      return this.clientRepo.save(client);
    }

    client = this.clientRepo.create(dto);
    return this.clientRepo.save(client);
  }

  async create(dto: CreateClientDto): Promise<Client> {
    const existing = await this.clientRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      throw new ConflictException(`Client with phone ${dto.phoneNumber} already exists`);
    }

    const client = this.clientRepo.create(dto);
    return this.clientRepo.save(client);
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.getById(id);

    if (dto.phoneNumber !== undefined && dto.phoneNumber !== client.phoneNumber) {
      const existing = await this.clientRepo.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing) throw new ConflictException(`Phone number already in use`);
      client.phoneNumber = dto.phoneNumber;
    }

    if (dto.name !== undefined) client.name = dto.name;
    if (dto.birthDate !== undefined) client.birthDate = dto.birthDate;
    if (dto.birthTime !== undefined) client.birthTime = dto.birthTime;
    if (dto.birthPlace !== undefined) client.birthPlace = dto.birthPlace;
    if (dto.notes !== undefined) client.notes = dto.notes;

    return this.clientRepo.save(client);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const res = await this.clientRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`Client with ID ${id} not found`);
    return { deleted: true };
  }
}
