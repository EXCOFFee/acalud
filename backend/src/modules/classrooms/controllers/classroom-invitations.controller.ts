import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CLASSROOM_TOKENS } from '../tokens';
import {
  ClassroomInvitation,
  IClassroomInvitationService,
  InvitationDispatchResult,
} from '../interfaces';
import { InviteStudentsDto } from '../dto/invite-students.dto';
import { ClassroomInvitation as ClassroomInvitationEntity } from '../classroom-invitation.entity';
import { ResendInvitationDto } from '../dto/resend-invitation.dto';

@ApiTags('classroom-invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classrooms')
export class ClassroomInvitationsController {
  constructor(
    @Inject(CLASSROOM_TOKENS.IClassroomInvitationService)
    private readonly invitationService: IClassroomInvitationService,
  ) {}

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Enviar invitaciones a estudiantes de un aula' })
  @ApiResponse({
    status: 200,
    description: 'Invitaciones procesadas exitosamente',
    type: Object,
  })
  async inviteStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() inviteDto: InviteStudentsDto,
    @Request() req,
  ): Promise<InvitationDispatchResult> {
    return this.invitationService.sendInvitations(id, req.user.id, inviteDto.emails, {
      message: inviteDto.message,
      redirectUrl: inviteDto.redirectUrl,
      metadata: inviteDto.metadata ? { ...inviteDto.metadata } : undefined,
    });
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'Listar invitaciones actuales del aula' })
  @ApiResponse({
    status: 200,
    description: 'Invitaciones obtenidas exitosamente',
    type: [ClassroomInvitationEntity],
  })
  async listInvitations(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<ClassroomInvitation[]> {
    return this.invitationService.listInvitations(id, req.user.id);
  }

  @Post(':id/invitations/:invitationId/resend')
  @ApiOperation({ summary: 'Reenviar una invitación pendiente' })
  @ApiResponse({
    status: 200,
    description: 'Invitación reenviada correctamente',
    type: ClassroomInvitationEntity,
  })
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Body() resendDto: ResendInvitationDto,
    @Request() req,
  ): Promise<ClassroomInvitation> {
    return this.invitationService.resendInvitation(id, invitationId, req.user.id, {
      message: resendDto.message,
      redirectUrl: resendDto.redirectUrl,
    });
  }

  @Delete(':id/invitations/:invitationId')
  @ApiOperation({ summary: 'Revocar una invitación' })
  @ApiResponse({
    status: 200,
    description: 'Invitación revocada correctamente',
    type: ClassroomInvitationEntity,
  })
  async revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Request() req,
  ): Promise<ClassroomInvitation> {
    return this.invitationService.revokeInvitation(id, invitationId, req.user.id);
  }
}
