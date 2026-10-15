import {
  Injectable,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Mengambil semua pengguna — untuk Admin
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
    });
  }

  // Mengambil petugas yang bisa menerima penugasan tiket
  async findAssignees() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.ADMIN,
            UserRole.IT_MANAGER,
            UserRole.IT_SUPPORT,
          ],
        },
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Membuat pengguna — untuk Admin
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    if (createUserDto.employeeId) {
      const existingEmployee = await this.prisma.user.findUnique({
        where: {
          employeeId: createUserDto.employeeId,
        },
      });

      if (existingEmployee) {
        throw new ConflictException('Employee ID sudah terdaftar');
      }
    }

    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      12,
    );

    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        passwordHash,
        employeeId: createUserDto.employeeId,
        role: createUserDto.role ?? UserRole.EMPLOYEE,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
    });
  }
}