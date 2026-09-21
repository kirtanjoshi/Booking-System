import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, Admin } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validateAdmin(loginDto: LoginDto): Promise<Omit<User, 'passwordHash'>> {
    return this.validateUser(loginDto);
  }

  async validateUser(loginDto: LoginDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findOne({
      where: { phoneNumber: loginDto.phoneNumber },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Account password has not been established. Please set a password via verified setup.',
      );
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const { passwordHash, whatsappAccessToken, ...result } = user;
    return result;
  }

  async getAdminById(id: string): Promise<Omit<User, 'passwordHash' | 'whatsappAccessToken'> | null> {
    return this.getUserById(id);
  }

  async getUserById(id: string): Promise<Omit<User, 'passwordHash' | 'whatsappAccessToken'> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) return null;
    const { passwordHash, whatsappAccessToken, ...result } = user;
    return result;
  }
}
