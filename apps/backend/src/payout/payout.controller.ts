import { Controller, Get, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, JwtAccessPayload } from '@clickpass/shared';

@Controller('payouts')
export class PayoutController {
  constructor(private readonly payouts: PayoutService) {}

  /** Liquidaciones del organizador autenticado (su panel). */
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  mine(@CurrentUser() user: JwtAccessPayload) {
    return this.payouts.findByOrganizer(user.sub);
  }

  /** Multas pendientes del organizador autenticado (por eventos cancelados). */
  @Get('penalties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  penalties(@CurrentUser() user: JwtAccessPayload) {
    return this.payouts.findPenaltiesByOrganizer(user.sub);
  }

  /** Dinero retenido pendiente de liquidar (solo ADMIN). */
  @Get('exposure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  exposure() {
    return this.payouts.getPendingExposure();
  }

  /** Dispara el ciclo de liquidación manualmente, sin esperar al cron (solo ADMIN). */
  @Post('run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  run() {
    return this.payouts.runCycle();
  }
}
