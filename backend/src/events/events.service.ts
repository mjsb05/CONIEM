import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { RegisterParticipantDto } from './dto/register-participant.dto.js';

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

  async registerParticipant(
    eventId: string,
    registerDto: RegisterParticipantDto,
  ) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const event = await transaction.event.findUnique({
          where: { id: eventId },
        });

        if (!event) {
          throw new NotFoundException('No se encontró el evento');
        }

        const studentByMatricula = await transaction.student.findUnique({
          where: { matricula: registerDto.matricula },
        });

        const studentByNfc = await transaction.student.findUnique({
          where: { nfcUid: registerDto.nfcUid },
        });

        if (
          studentByMatricula &&
          studentByNfc &&
          studentByMatricula.id !== studentByNfc.id
        ) {
          throw new ConflictException(
            'La matrícula y el NFC pertenecen a estudiantes distintos',
          );
        }

        let student = studentByMatricula ?? studentByNfc;

        if (student) {
          if (
            student.matricula !== registerDto.matricula ||
            student.nfcUid !== registerDto.nfcUid
          ) {
            throw new ConflictException(
              'La matrícula o el NFC ya están asociados a otro estudiante',
            );
          }
        } else {
          student = await transaction.student.create({
            data: {
              fullName: registerDto.fullName,
              matricula: registerDto.matricula,
              nfcUid: registerDto.nfcUid,
            },
          });
        }

        const existingRegistration =
          await transaction.eventParticipant.findUnique({
            where: {
              eventId_studentId: {
                eventId,
                studentId: student.id,
              },
            },
          });

        if (existingRegistration) {
          throw new ConflictException(
            'Este estudiante ya está registrado en el evento',
          );
        }

        return transaction.eventParticipant.create({
          data: {
            eventId,
            studentId: student.id,
          },
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                matricula: true,
                nfcUid: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'La matrícula, el NFC o la inscripción ya existen',
        );
      }

      throw error;
    }
  }
}