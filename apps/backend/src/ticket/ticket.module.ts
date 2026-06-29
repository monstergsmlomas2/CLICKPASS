import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  // JwtModule: firma/verifica el token del link mágico para ver entradas de invitado
  // (el secret se pasa por firma, igual que en auth y refund).
  imports: [JwtModule.register({})],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
