import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthenticationService } from './authentication.service';
import { LoginDto } from './dto/login.dto';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateAdmin(loginDto);
    (req as any).session.adminId = user.id;
    (req as any).session.userId = user.id;
    (req as any).session.role = user.role;
    (req as any).session.phoneNumber = user.phoneNumber;

    return {
      message: 'Login successful',
      user,
      admin: user,
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
  @UseGuards(AdminAuthGuard)
  async me(@Req() req: Request) {
    const adminId = (req as any).session.adminId;
    const admin = await this.authService.getAdminById(adminId);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    return admin;
  }
}
