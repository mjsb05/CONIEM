import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { RegisterParticipantDto } from './dto/register-participant.dto.js';
import { EventsService } from './events.service.js';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Post(':eventId/sessions')
  @Roles('ADMIN')
  createSession(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() createSessionDto: CreateSessionDto,
  ) {
    return this.eventsService.createSession(eventId, createSessionDto);
  }

  @Post(':eventId/participants')
  registerParticipant(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() registerDto: RegisterParticipantDto,
  ) {
    return this.eventsService.registerParticipant(eventId, registerDto);
  }
}