import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthenticationService } from './authentication.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(loginDto);
    const roleCode = user.role?.code || (user as any).roleCode || 'USER';

    (req as any).session.userId = user.id;
    (req as any).session.role = roleCode;
    (req as any).session.phoneNumber = user.phoneNumber;

    if (roleCode === 'ADMIN') {
      (req as any).session.adminId = user.id;
    }

    return {
      message: 'Login successful',
      user,
      admin: roleCode === 'ADMIN' ? user : undefined,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await new Promise<void>((resolve, reject) => {
      (req as any).session.destroy((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.clearCookie('connect.sid', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const userId = (req as any).session.userId || (req as any).session.adminId;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = await this.authService.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
