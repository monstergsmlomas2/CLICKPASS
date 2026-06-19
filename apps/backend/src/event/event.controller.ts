import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddEventDateDto } from './dto/add-event-date.dto';
import { ImportPreviewDto, ImportConfirmDto } from './dto/import-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, JwtAccessPayload } from '@clickpass/shared';

@Controller('events')
export class EventController {
  constructor(private readonly events: EventService) {}

  // ---- Público ----
  @Get()
  list(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.events.findPublished({
      category,
      city,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.events.findOne(id);
  }

  // ---- Organizador / Admin ----
  @Get('mine/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  mine(@CurrentUser() user: JwtAccessPayload) {
    return this.events.findByOrganizer(user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  create(@CurrentUser() user: JwtAccessPayload, @Body() dto: CreateEventDto) {
    return this.events.create(user.sub, dto);
  }

  @Post('import/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  importPreview(@Body() dto: ImportPreviewDto) {
    return this.events.previewImport(dto.csv);
  }

  @Post('import/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  importConfirm(@CurrentUser() user: JwtAccessPayload, @Body() dto: ImportConfirmDto) {
    return this.events.confirmImport(user.sub, dto.rows);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  update(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(id, user, dto);
  }

  @Post(':id/dates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  addDate(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: AddEventDateDto,
  ) {
    return this.events.addDate(id, user, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  publish(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.events.publish(id, user);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  cancel(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.events.cancel(id, user);
  }
}
