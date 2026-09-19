import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionType } from './entities/session-type.entity';
import { Admin } from '../admin/entities/admin.entity';
import {
  CreateSessionTypeDto,
  UpdateSessionTypeDto,
} from './dto/create-session-type.dto';

@Injectable()
export class SessionTypeService {
  constructor(
    @InjectRepository(SessionType)
    private readonly sessionTypeRepo: Repository<SessionType>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async getAll(adminId?: string): Promise<SessionType[]> {
    return this.sessionTypeRepo.find({
      where: adminId ? { admin: { id: adminId } } : {},
      order: { durationMinutes: 'ASC' },
    });
  }

  async getById(id: string): Promise<SessionType> {
    const st = await this.sessionTypeRepo.findOne({ where: { id } });
    if (!st) throw new NotFoundException(`SessionType with ID ${id} not found`);
    return st;
  }

  async create(adminId: string, dto: CreateSessionTypeDto): Promise<SessionType> {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const st = this.sessionTypeRepo.create({
      admin,
      name: dto.name,
      durationMinutes: dto.durationMinutes,
      bufferMinutes: dto.bufferMinutes ?? 0,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });

    return this.sessionTypeRepo.save(st);
  }

  async update(id: string, dto: UpdateSessionTypeDto): Promise<SessionType> {
    const st = await this.getById(id);

    if (dto.name !== undefined) st.name = dto.name;
    if (dto.durationMinutes !== undefined) st.durationMinutes = dto.durationMinutes;
    if (dto.bufferMinutes !== undefined) st.bufferMinutes = dto.bufferMinutes;
    if (dto.description !== undefined) st.description = dto.description;
    if (dto.isActive !== undefined) st.isActive = dto.isActive;

    return this.sessionTypeRepo.save(st);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const res = await this.sessionTypeRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`SessionType with ID ${id} not found`);
    return { deleted: true };
  }
}
