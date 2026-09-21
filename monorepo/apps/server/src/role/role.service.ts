import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { ROLES } from './roles.data';

@Injectable()
export class RoleService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  async seedRoles(): Promise<void> {
    for (const r of ROLES) {
      const existing = await this.roleRepository.findOne({ where: { code: r.code } });
      if (!existing) {
        await this.roleRepository.save(this.roleRepository.create(r));
      }
    }
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { code } });
  }

  async getAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }
}
