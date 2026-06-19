import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { ReserveTicketDto } from './dto/reserve-ticket.dto';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAccessPayload, Role } from '@clickpass/shared';

@Controller('tickets')
export class TicketController {
  constructor(private readonly tickets: TicketService) {}

  /** Compra sin cuenta: si viene un access token válido se usa esa identidad; si no, exige datos de invitado. */
  @Post('reserve')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  reserve(
    @CurrentUser() user: JwtAccessPayload | null,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: ReserveTicketDto,
  ) {
    return this.tickets.reserve(user, idempotencyKey, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: JwtAccessPayload) {
    return this.tickets.findByUser(user.sub);
  }

  @Post('check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  checkIn(@CurrentUser() user: JwtAccessPayload, @Body() dto: CheckInDto) {
    return this.tickets.checkIn(user, dto.qrCode);
  }
}
