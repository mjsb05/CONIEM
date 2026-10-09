import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { CreateSessionDto } from './dto/create-session.dto.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  create(createEventDto: CreateEventDto) {
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: createEventDto.timeZone,
      });
    } catch {
      throw new BadRequestException(
        'La zona horaria debe ser un identificador IANA válido',
      );
    }

    const startsAt = createEventDto.startsAt
      ? new Date(createEventDto.startsAt)
      : undefined;

    const endsAt = createEventDto.endsAt
      ? new Date(createEventDto.endsAt)
      : undefined;

    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    return this.prisma.event.create({
      data: {
        name: createEventDto.name,
        timeZone: createEventDto.timeZone,
        ...(startsAt && { startsAt }),
        ...(endsAt && { endsAt }),
      },
    });
  }

  async createSession(eventId: string, createSessionDto: CreateSessionDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('No se encontró el evento');
    }

    const startsAt = new Date(createSessionDto.startsAt);
    const endsAt = new Date(createSessionDto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'El inicio de la sesión debe ser anterior a su fin',
      );
    }

    if (event.startsAt && startsAt < event.startsAt) {
      throw new BadRequestException(
        'La sesión no puede iniciar antes que el evento',
      );
    }

    if (event.endsAt && endsAt > event.endsAt) {
      throw new BadRequestException(
        'La sesión no puede terminar después que el evento',
      );
    }

    return this.prisma.activitySession.create({
      data: {
        eventId,
        name: createSessionDto.name,
        type: createSessionDto.type,
        startsAt,
        endsAt,
        capacity: createSessionDto.type === 'WORKSHOP' ? 35 : null,
      },
    });
  }
}