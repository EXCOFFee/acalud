import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classroom } from './classroom.entity';
import { ClassroomInvitation } from './classroom-invitation.entity';
import { Activity } from '../activities/activity.entity';
import { User } from '../users/user.entity';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomInvitationsController } from './controllers/classroom-invitations.controller';
import { ClassroomInvitationPublicController } from './controllers/classroom-invitations-public.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { CLASSROOM_TOKENS } from './tokens';
import { ClassroomRepository } from './repositories/classroom.repository';
import { ClassroomInvitationRepository } from './repositories/classroom-invitation.repository';
import { ClassroomValidator } from './validators/classroom.validator';
import { PermissionValidator } from './validators/permission.validator';
import { InviteCodeGenerator } from './generators/invite-code.generator';
import { ClassroomBusinessService } from './services/classroom-business.service';
import { ClassroomInvitationService } from './services/classroom-invitation.service';

/**
 * Módulo de aulas (classrooms)
 * Gestiona todas las funcionalidades relacionadas con las aulas virtuales
 * Incluye creación, gestión de estudiantes, códigos de invitación y configuraciones
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Classroom, ClassroomInvitation, Activity, User]),
    UsersModule, // Importamos para acceder al servicio de usuarios
    forwardRef(() => AuthModule),
  ],
  providers: [
    {
      provide: CLASSROOM_TOKENS.IClassroomService,
      useClass: ClassroomBusinessService,
    },
    {
      provide: CLASSROOM_TOKENS.IClassroomRepository,
      useClass: ClassroomRepository,
    },
    {
      provide: CLASSROOM_TOKENS.IClassroomValidator,
      useClass: ClassroomValidator,
    },
    {
      provide: CLASSROOM_TOKENS.IPermissionValidator,
      useClass: PermissionValidator,
    },
    {
      provide: CLASSROOM_TOKENS.IInviteCodeGenerator,
      useClass: InviteCodeGenerator,
    },
    {
      provide: CLASSROOM_TOKENS.IClassroomInvitationRepository,
      useClass: ClassroomInvitationRepository,
    },
    {
      provide: CLASSROOM_TOKENS.IClassroomInvitationService,
      useClass: ClassroomInvitationService,
    },
    ClassroomBusinessService,
    ClassroomRepository,
    ClassroomInvitationRepository,
    ClassroomValidator,
    PermissionValidator,
    InviteCodeGenerator,
    ClassroomInvitationService,
  ],
  controllers: [
    ClassroomsController,
    ClassroomInvitationsController,
    ClassroomInvitationPublicController,
  ],
  exports: [
    CLASSROOM_TOKENS.IClassroomService,
    CLASSROOM_TOKENS.IClassroomRepository,
    CLASSROOM_TOKENS.IClassroomValidator,
    CLASSROOM_TOKENS.IPermissionValidator,
    CLASSROOM_TOKENS.IInviteCodeGenerator,
    CLASSROOM_TOKENS.IClassroomInvitationRepository,
    CLASSROOM_TOKENS.IClassroomInvitationService,
    TypeOrmModule,
  ],
})
export class ClassroomsModule {}
