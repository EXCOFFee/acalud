import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CLASSROOM_TOKENS } from '../tokens';
import {
  IClassroomInvitationService,
  InvitationConsumptionResult,
  InvitationValidationResult,
} from '../interfaces';
import { ValidateInvitationDto } from '../dto/validate-invitation.dto';
import { ConsumeInvitationDto } from '../dto/consume-invitation.dto';

@ApiTags('classroom-invitations')
@Controller('classrooms/invitations')
export class ClassroomInvitationPublicController {
  constructor(
    @Inject(CLASSROOM_TOKENS.IClassroomInvitationService)
    private readonly invitationService: IClassroomInvitationService,
  ) {}

  @Get('validate')
  @ApiOperation({ summary: 'Validar un token de invitación' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la validación del token',
    type: Object,
  })
  async validateInvitation(
    @Query() query: ValidateInvitationDto,
  ): Promise<InvitationValidationResult> {
    return this.invitationService.validateInvitationToken(query.token);
  }

  @Post('consume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consumir un token de invitación' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la aceptación de invitación',
    type: Object,
  })
  async consumeInvitation(
    @Body() body: ConsumeInvitationDto,
    @Request() req,
  ): Promise<InvitationConsumptionResult> {
    return this.invitationService.consumeInvitationToken(body.token, req.user.id, body.email);
  }
}
