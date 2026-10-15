import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './create-ticket.dto';
import { UpdateTicketStatusDto } from './update-ticket-status.dto';
import { AssignTicketDto } from './assign-ticket.dto';
import { CreateTicketCommentDto } from './create-ticket-comment.dto';
import { CreateSlaDto } from './create-sla.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../generated/prisma/client';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // 1. Membuat tiket baru
  @Post()
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.create(
      createTicketDto,
      req.user.userId,
    );
  }

  // 2. Melihat daftar tiket
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.ticketsService.findAll(
      req.user.userId,
      req.user.role,
    );
  }

  // 3. Melihat daftar SLA
  // Semua pengguna yang sudah login boleh melihat SLA.
  @Get('sla')
  findAllSla() {
    return this.ticketsService.findAllSla();
  }

  // 4. Membuat SLA — khusus Admin dan IT Manager
  @Post('sla')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.IT_MANAGER)
  createSla(@Body() dto: CreateSlaDto) {
    return this.ticketsService.createSla(dto);
  }

  // 5. Melihat detail satu tiket
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findOne(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  // 6. Mengubah status tiket — khusus tim IT
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.IT_MANAGER,
    UserRole.IT_SUPPORT,
  )
  updateStatus(
    @Param('id') id: string,
    @Body() updateTicketStatusDto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(
      id,
      updateTicketStatusDto,
    );
  }

  // 7. Menugaskan tiket kepada petugas IT
  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.IT_MANAGER,
    UserRole.IT_SUPPORT,
  )
  assign(
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(
      id,
      assignTicketDto.assignedToId,
    );
  }

  // 8. Menambahkan komentar ke tiket
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.addComment(
      id,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  // 9. Melihat komentar dalam tiket
  @Get(':id/comments')
  findComments(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findComments(
      id,
      req.user.userId,
      req.user.role,
    );
  }
}