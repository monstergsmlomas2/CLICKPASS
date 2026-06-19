import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CheckoutDto } from './dto/checkout.dto';
import { SimulateDto } from './dto/simulate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAccessPayload } from '@clickpass/shared';

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  /** Igual que /tickets/reserve: admite comprador logueado o invitado (dto.guestEmail). */
  @Post('checkout')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  checkout(@CurrentUser() user: JwtAccessPayload | null, @Body() dto: CheckoutDto) {
    return this.payments.createCheckout(user, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: JwtAccessPayload) {
    return this.payments.findByUser(user.sub);
  }

  /**
   * Webhook de MercadoPago (público). Acepta el id del pago tanto por body
   * ({ type, data: { id } }) como por query (?type=payment&data.id=...).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Body() body: { type?: string; action?: string; data?: { id?: string | number } },
    @Query() query: Record<string, string>,
  ) {
    const type = body?.type ?? query?.type ?? query?.topic;
    if (type && type !== 'payment') return { ok: true, ignored: true };

    const id =
      body?.data?.id ?? query?.['data.id'] ?? query?.id ?? undefined;
    if (!id) return { ok: true };

    return this.payments.processWebhook(String(id));
  }

  /** Solo desarrollo / modo simulado: emula la aprobación o rechazo de MercadoPago. */
  @Post('_simulate')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  simulate(@Body() dto: SimulateDto) {
    return this.payments.simulate(dto.reference, dto.status);
  }
}
