import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientDetails, Client } from './entities/client_details.entity';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';
import { User } from '../user/entities/user.entity';
import { RoleService } from '../role/role.service';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(ClientDetails)
    private readonly clientRepo: Repository<ClientDetails>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly roleService: RoleService,
  ) {}

  async getAll(): Promise<ClientDetails[]> {
    return this.clientRepo.find({
      relations: ['bookings', 'bookings.sessionType', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: string): Promise<ClientDetails> {
    const client = await this.clientRepo.findOne({
      where: { id },
      relations: ['bookings', 'bookings.sessionType', 'messages', 'user'],
    });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client;
  }

  async findOrCreate(dto: CreateClientDto): Promise<ClientDetails> {
    // 1. Ensure User entity exists with role 'USER'
    let user = await this.userRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
      relations: ['role'],
    });

    if (!user) {
      const userRole = await this.roleService.findByCode('USER');
      user = this.userRepo.create({
        phoneNumber: dto.phoneNumber,
        name: dto.name || 'Client',
        role: userRole || undefined,
        roleCode: 'USER',
        timezone: 'Asia/Kathmandu',
      });
      user = await this.userRepo.save(user);
    } else if (dto.name && (!user.name || user.name === 'Client')) {
      user.name = dto.name;
      await this.userRepo.save(user);
    }

    // 2. Ensure ClientDetails exists and links to User
    let client = await this.clientRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
      relations: ['user'],
    });

    if (client) {
      if (!client.userId && user) {
        client.userId = user.id;
        client.user = user;
      }
      if (dto.name && !client.name) client.name = dto.name;
      if (dto.birthDate && !client.birthDate) client.birthDate = dto.birthDate;
      if (dto.birthTime && !client.birthTime) client.birthTime = dto.birthTime;
      if (dto.birthPlace && !client.birthPlace) client.birthPlace = dto.birthPlace;
      if (dto.notes && !client.notes) client.notes = dto.notes;
      return this.clientRepo.save(client);
    }

    client = this.clientRepo.create({
      ...dto,
      userId: user?.id,
      user: user || undefined,
    });
    return this.clientRepo.save(client);
  }

  async create(dto: CreateClientDto): Promise<ClientDetails> {
    const existing = await this.clientRepo.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      throw new ConflictException(`Client with phone ${dto.phoneNumber} already exists`);
    }

    return this.findOrCreate(dto);
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientDetails> {
    const client = await this.getById(id);

    if (dto.phoneNumber !== undefined && dto.phoneNumber !== client.phoneNumber) {
      const existing = await this.clientRepo.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing) throw new ConflictException(`Phone number already in use`);
      client.phoneNumber = dto.phoneNumber;
      // Sync phone in user table too
      if (client.userId) {
        await this.userRepo.update(client.userId, { phoneNumber: dto.phoneNumber });
      }
    }

    if (dto.name !== undefined) {
      client.name = dto.name;
      if (client.phoneNumber) {
        await this.userRepo.update({ phoneNumber: client.phoneNumber }, { name: dto.name });
      }
    }

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
