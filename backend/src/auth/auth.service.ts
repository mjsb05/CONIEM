import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.staffUser.findUnique({
      where: { username: loginDto.username },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const passwordIsValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async createStaff(createStaffDto: CreateStaffDto) {
    if (Buffer.byteLength(createStaffDto.password, 'utf8') > 72) {
      throw new BadRequestException(
        'La contraseña no puede superar 72 bytes',
      );
    }

    const passwordHash = await bcrypt.hash(createStaffDto.password, 12);

    try {
      return await this.prisma.staffUser.create({
        data: {
          username: createStaffDto.username,
          passwordHash,
          role: 'STAFF',
        },
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese nombre de usuario ya está registrado');
      }

      throw error;
    }
  }
}