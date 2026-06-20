import { Body, Controller, Get, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, JwtAccessPayload } from '@clickpass/shared';

class RequestRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;
}

class RequestGuestRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsEmail()
  email: string;
}

class ConfirmGuestRefundDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@Controller('refunds')
export class RefundController {
  constructor(private readonly refunds: RefundService) {}

  /** Reembolso voluntario solicitado por el usuario (sujeto a la política del organizador). */
  @Post('request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  request(@CurrentUser() user: JwtAccessPayload, @Body() dto: RequestRefundDto) {
    return this.refunds.requestUserRefund(user, dto.paymentId);
  }

  /**
   * Paso 1 para comprador SIN cuenta: pide el link de reembolso indicando paymentId + email.
   * Público. Respuesta genérica (no revela si el pago existe).
   */
  @Post('request-guest')
  @HttpCode(HttpStatus.OK)
  requestGuest(@Body() dto: RequestGuestRefundDto) {
    return this.refunds.requestGuestRefundLink(dto.paymentId, dto.email);
  }

  /** Paso 2 para comprador SIN cuenta: confirma el reembolso con el token del email. Público. */
  @Post('confirm-guest')
  @HttpCode(HttpStatus.OK)
  confirmGuest(@Body() dto: ConfirmGuestRefundDto) {
    return this.refunds.confirmGuestRefund(dto.token);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: JwtAccessPayload) {
    return this.refunds.findByUser(user.sub);
  }

  /** Métrica de exposición acumulada de bonos por SLA (solo ADMIN). */
  @Get('exposure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  exposure() {
    return this.refunds.getBonusExposure();
  }
}
