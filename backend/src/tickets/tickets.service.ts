import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './create-ticket.dto';
import { UpdateTicketStatusDto } from './update-ticket-status.dto';
import { CreateTicketCommentDto } from './create-ticket-comment.dto';
import { CreateSlaDto } from './create-sla.dto';

import {
  TicketCategory,
  TicketPriority,
  UserRole,
} from '../generated/prisma/client';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Membuat tiket dengan deadline SLA otomatis
  async create(createTicketDto: CreateTicketDto, userId: string) {
    const ticketNumber = `TKT-${Date.now()}`;
    const now = new Date();

    let responseDueAt: Date | null = null;
    let resolutionDueAt: Date | null = null;

    // Memastikan SLA tersedia dan mengambil target waktunya
    if (createTicketDto.slaId) {
      const existingSla = await this.prisma.sLA.findUnique({
        where: { id: createTicketDto.slaId },
        select: {
          id: true,
          responseTimeMinutes: true,
          resolutionTimeMinutes: true,
        },
      });

      if (!existingSla) {
        throw new NotFoundException('SLA tidak ditemukan');
      }

      // Menghitung batas waktu respons
      responseDueAt = new Date(
        now.getTime() +
          existingSla.responseTimeMinutes * 60 * 1000,
      );

      // Menghitung batas waktu penyelesaian
      resolutionDueAt = new Date(
        now.getTime() +
          existingSla.resolutionTimeMinutes * 60 * 1000,
      );
    }

    return this.prisma.ticket.create({
      data: {
        ticketNumber,
        title: createTicketDto.title,
        description: createTicketDto.description,
        requesterId: userId,
        createdById: userId,
        priority:
          createTicketDto.priority ?? TicketPriority.MEDIUM,
        category:
          createTicketDto.category ?? TicketCategory.OTHER,

        ...(createTicketDto.slaId
          ? { slaId: createTicketDto.slaId }
          : {}),

        responseDueAt,
        resolutionDueAt,
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        requesterId: true,
        createdById: true,
        slaId: true,
        responseDueAt: true,
        resolutionDueAt: true,
        sla: {
          select: {
            id: true,
            name: true,
            responseTimeMinutes: true,
            resolutionTimeMinutes: true,
          },
        },
        createdAt: true,
      },
    });
  }

  // 2. Melihat daftar tiket
  async findAll(userId: string, role: string) {
    const isITStaff = [
      'ADMIN',
      'IT_MANAGER',
      'IT_SUPPORT',
    ].includes(role);

    return this.prisma.ticket.findMany({
      where: isITStaff ? {} : { requesterId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        sla: {
          select: {
            id: true,
            name: true,
            responseTimeMinutes: true,
            resolutionTimeMinutes: true,
          },
        },
      },
    });
  }

  // 3. Melihat detail satu tiket
  async findOne(ticketId: string, userId: string, role: string) {
    const isITStaff = [
      'ADMIN',
      'IT_MANAGER',
      'IT_SUPPORT',
    ].includes(role);

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ...(isITStaff ? {} : { requesterId: userId }),
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        sla: {
          select: {
            id: true,
            name: true,
            responseTimeMinutes: true,
            resolutionTimeMinutes: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    return ticket;
  }

  // 4. Mengubah status dan mencatat respons pertama
  async updateStatus(
    ticketId: string,
    updateTicketStatusDto: UpdateTicketStatusDto,
  ) {
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    const now = new Date();

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: updateTicketStatusDto.status,

        // Mencatat respons pertama ketika tiket mulai dikerjakan
        ...(updateTicketStatusDto.status === 'IN_PROGRESS' &&
        existingTicket.firstRespondedAt === null
          ? { firstRespondedAt: now }
          : {}),

        // Mencatat waktu penyelesaian tanpa menimpa waktu sebelumnya
        ...(updateTicketStatusDto.status === 'RESOLVED' &&
        existingTicket.resolvedAt === null
          ? { resolvedAt: now }
          : {}),
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        category: true,
        firstRespondedAt: true,
        responseDueAt: true,
        resolutionDueAt: true,
        updatedAt: true,
        resolvedAt: true,
      },
    });
  }

  // 5. Menugaskan tiket kepada petugas IT
  async assign(ticketId: string, assignedToId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: assignedToId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!assignee) {
      throw new NotFoundException(
        'Pengguna yang ditugaskan tidak ditemukan',
      );
    }

    const allowedRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.IT_MANAGER,
      UserRole.IT_SUPPORT,
    ];

    if (!allowedRoles.includes(assignee.role)) {
      throw new BadRequestException(
        'Tiket hanya dapat ditugaskan kepada petugas IT',
      );
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: assignee.id,
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        updatedAt: true,
      },
    });
  }

  // 6. Menambahkan komentar ke tiket
  async addComment(
    ticketId: string,
    userId: string,
    role: string,
    dto: CreateTicketCommentDto,
  ) {
    const isITStaff = [
      'ADMIN',
      'IT_MANAGER',
      'IT_SUPPORT',
    ].includes(role);

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ...(isITStaff ? {} : { requesterId: userId }),
      },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    const content = dto.content.trim();

    if (content.length < 2) {
      throw new BadRequestException(
        'Komentar minimal harus terdiri dari 2 karakter',
      );
    }

    return this.prisma.ticketComment.create({
      data: {
        content,
        ticketId: ticket.id,
        authorId: userId,
      },
      select: {
        id: true,
        content: true,
        ticketId: true,
        authorId: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  // 7. Melihat komentar dalam tiket
  async findComments(
    ticketId: string,
    userId: string,
    role: string,
  ) {
    const isITStaff = [
      'ADMIN',
      'IT_MANAGER',
      'IT_SUPPORT',
    ].includes(role);

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ...(isITStaff ? {} : { requesterId: userId }),
      },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    return this.prisma.ticketComment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  // 8. Membuat konfigurasi SLA
  async createSla(dto: CreateSlaDto) {
    const existingSla = await this.prisma.sLA.findUnique({
      where: { name: dto.name },
    });

    if (existingSla) {
      throw new BadRequestException('Nama SLA sudah digunakan');
    }

    return this.prisma.sLA.create({
      data: {
        name: dto.name,
        description: dto.description,
        responseTimeMinutes: dto.responseTimeMinutes,
        resolutionTimeMinutes: dto.resolutionTimeMinutes,
      },
      select: {
        id: true,
        name: true,
        description: true,
        responseTimeMinutes: true,
        resolutionTimeMinutes: true,
        createdAt: true,
      },
    });
  }

  // 9. Melihat daftar konfigurasi SLA
  async findAllSla() {
    return this.prisma.sLA.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        responseTimeMinutes: true,
        resolutionTimeMinutes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}