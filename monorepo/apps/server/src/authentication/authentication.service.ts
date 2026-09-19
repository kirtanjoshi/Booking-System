import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Admin } from '../admin/entities/admin.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async validateAdmin(loginDto: LoginDto): Promise<Omit<Admin, 'passwordHash'>> {
    const admin = await this.adminRepository.findOne({
      where: { phoneNumber: loginDto.phoneNumber },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const { passwordHash, ...result } = admin;
    return result;
  }

  async getAdminById(id: string): Promise<Omit<Admin, 'passwordHash'> | null> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) return null;
    const { passwordHash, ...result } = admin;
    return result;
  }
}
