import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';

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
}