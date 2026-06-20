import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Endpoint protegido de ejemplo: devuelve el usuario del access token. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user;
  }

  /** Un comprador (USER) pasa a organizador. Reemite tokens con el nuevo rol. */
  @Post('become-organizer')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  becomeOrganizer(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.auth.becomeOrganizer(user.sub);
  }
}
