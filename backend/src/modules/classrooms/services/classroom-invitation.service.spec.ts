import { ClassroomInvitationService } from './classroom-invitation.service';
import { Classroom } from '../classroom.entity';
import { ClassroomInvitation, InvitationStatus } from '../classroom-invitation.entity';
import {
  IClassroomRepository,
  IPermissionValidator,
  IClassroomInvitationRepository,
  InvitationDispatchResult,
  InvitationDispatchItem,
} from '../interfaces';
import { EmailService } from '../../auth/services/email.service';
import { ResourceNotFoundException, ValidationException } from '../../../common/exceptions/business.exception';
import { User, UserRole } from '../../users/user.entity';

const buildTeacher = (): User =>
  Object.assign(new User(), {
    id: 'teacher-1',
    role: UserRole.TEACHER,
    email: 'teacher@school.edu',
    firstName: 'Ana',
    lastName: 'Pérez',
  });

const buildClassroom = (overrides: Partial<Classroom> = {}): Classroom =>
  Object.assign(new Classroom(), {
    id: 'classroom-1',
    name: 'Matemáticas Aplicadas',
    description: 'Aula enfocada en álgebra y geometría.',
    subject: 'Matemáticas',
    grade: '4° Medio',
    inviteCode: 'INV123',
    isActive: true,
    teacherId: 'teacher-1',
    teacher: buildTeacher(),
    students: [],
    invitedStudentEmails: [],
    activities: [],
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const buildInvitation = (overrides: Partial<ClassroomInvitation> = {}): ClassroomInvitation =>
  Object.assign(new ClassroomInvitation(), {
    id: 'invitation-1',
    classroomId: 'classroom-1',
    email: 'student@school.edu',
    token: 'token-123',
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 86400000),
    classroom: buildClassroom(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('ClassroomInvitationService', () => {
  let service: ClassroomInvitationService;
  let classroomRepository: jest.Mocked<IClassroomRepository>;
  let permissionValidator: jest.Mocked<IPermissionValidator>;
  let invitationRepository: jest.Mocked<IClassroomInvitationRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeAll(() => {
    process.env.FRONTEND_BASE_URL = 'https://app.acalud.dev/invite';
  });

  beforeEach(() => {
    classroomRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      addStudent: jest.fn(),
    } as unknown as jest.Mocked<IClassroomRepository>;

    permissionValidator = {
      validateCanModifyClassroom: jest.fn(),
    } as unknown as jest.Mocked<IPermissionValidator>;

    invitationRepository = {
      createOrUpdatePending: jest.fn(),
      findByToken: jest.fn(),
      listByClassroom: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IClassroomInvitationRepository>;

    emailService = {
      sendClassroomInvitationEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);

    const defaultClassroom = buildClassroom();
    classroomRepository.findById.mockResolvedValue(defaultClassroom);
    classroomRepository.update.mockResolvedValue(defaultClassroom);
    classroomRepository.addStudent.mockResolvedValue(defaultClassroom);
    invitationRepository.findById.mockResolvedValue(buildInvitation());
    invitationRepository.save.mockImplementation(async invitation => invitation);

    service = new ClassroomInvitationService(
      classroomRepository,
      permissionValidator,
      invitationRepository,
      emailService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendInvitations', () => {
    it('envía invitaciones válidas y omite correos inválidos', async () => {
      const classroom = buildClassroom();
      classroomRepository.findById.mockResolvedValue(classroom);
      invitationRepository.createOrUpdatePending.mockImplementation(async () => buildInvitation());
      emailService.sendClassroomInvitationEmail.mockResolvedValue(true);

      const result = await service.sendInvitations('classroom-1', 'teacher-1', [
        'student1@school.edu ',
        'invalid-email',
        'student1@school.edu',
      ]);

      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith('classroom-1', 'teacher-1');
      expect(invitationRepository.createOrUpdatePending).toHaveBeenCalledTimes(1);
      expect(classroomRepository.update).toHaveBeenCalledWith(
        'classroom-1',
        expect.objectContaining({ invitedStudentEmails: ['student1@school.edu'] }),
      );

      const processed = result.processed as InvitationDispatchItem[];
      expect(processed).toHaveLength(2);
      const sentItem = processed.find(item => item.status === 'sent');
      const skippedItem = processed.find(item => item.status === 'skipped');

      expect(sentItem).toMatchObject({ email: 'student1@school.edu', status: 'sent' });
      expect(skippedItem).toMatchObject({ email: 'invalid-email', reason: 'invalid_email' });
      expect(emailService.sendClassroomInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student1@school.edu',
          classroomName: classroom.name,
          teacherName: 'Ana Pérez',
        }),
      );
    });

    it('omite estudiantes inscritos y elimina pendientes duplicados', async () => {
      const classroom = buildClassroom({
        students: [Object.assign(new User(), { id: 'student-registered', email: 'student2@school.edu' })],
        invitedStudentEmails: ['student2@school.edu'],
      });
      classroomRepository.findById.mockResolvedValue(classroom);
      invitationRepository.createOrUpdatePending.mockImplementation(async data =>
        buildInvitation({ email: data.email, token: data.token }),
      );
      emailService.sendClassroomInvitationEmail.mockResolvedValue(true);

      const result = await service.sendInvitations('classroom-1', 'teacher-1', [
        'student2@school.edu',
        'student3@school.edu',
      ]);

      expect(result.requested).toBe(2);
      expect(result.processed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: 'student2@school.edu', reason: 'already_enrolled', status: 'skipped' }),
          expect.objectContaining({ email: 'student3@school.edu', status: 'sent' }),
        ]),
      );
      expect(invitationRepository.createOrUpdatePending).toHaveBeenCalledTimes(1);
      expect(classroomRepository.update).toHaveBeenCalledWith(
        'classroom-1',
        expect.objectContaining({ invitedStudentEmails: ['student3@school.edu'] }),
      );
    });

    it('lanza ResourceNotFoundException cuando el aula no existe', async () => {
      classroomRepository.findById.mockResolvedValue(null);

      await expect(
        service.sendInvitations('classroom-1', 'teacher-1', ['student@school.edu']),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      expect(invitationRepository.createOrUpdatePending).not.toHaveBeenCalled();
    });
  });

  describe('validateInvitationToken', () => {
    it('marca la invitación como expirada cuando la fecha venció', async () => {
      const expiredInvitation = buildInvitation({
        expiresAt: new Date(Date.now() - 3600),
      });
      invitationRepository.findByToken.mockResolvedValue(expiredInvitation);
      invitationRepository.updateStatus.mockImplementation(async () =>
        buildInvitation({ status: InvitationStatus.EXPIRED }),
      );

      const result = await service.validateInvitationToken('token-123');

      expect(result.valid).toBe(false);
      expect(result.status).toBe(InvitationStatus.EXPIRED);
      expect(result.reason).toBe('expired');
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith(
        expiredInvitation.id,
        InvitationStatus.EXPIRED,
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('consumeInvitationToken', () => {
    it('acepta el token cuando es válido y vincula al estudiante', async () => {
      const invitation = buildInvitation();
      const classroom = buildClassroom({ invitedStudentEmails: ['student@school.edu'] });

      invitationRepository.findByToken
        .mockResolvedValueOnce(invitation)
        .mockResolvedValueOnce(invitation);
      invitationRepository.updateStatus.mockResolvedValue(buildInvitation({ status: InvitationStatus.ACCEPTED }));
      classroomRepository.findById.mockResolvedValue(classroom);

      const result = await service.consumeInvitationToken('token-123', 'student-id', 'student@school.edu');

      expect(invitationRepository.updateStatus).toHaveBeenCalledWith(
        invitation.id,
        InvitationStatus.ACCEPTED,
        expect.objectContaining({ acceptedById: 'student-id', acceptedAt: expect.any(Date) }),
      );
      expect(classroomRepository.addStudent).toHaveBeenCalledWith('classroom-1', 'student-id');
      expect(classroomRepository.update).toHaveBeenCalledWith(
        'classroom-1',
        expect.objectContaining({ invitedStudentEmails: [] }),
      );
      expect(result).toEqual({
        status: InvitationStatus.ACCEPTED,
        classroomId: 'classroom-1',
        studentId: 'student-id',
        email: 'student@school.edu',
      });
    });

    it('lanza ValidationException cuando el correo no coincide', async () => {
      const invitation = buildInvitation({ email: 'another@school.edu' });
      invitationRepository.findByToken
        .mockResolvedValueOnce(invitation)
        .mockResolvedValueOnce(invitation);

      await expect(
        service.consumeInvitationToken('token-123', 'student-id', 'student@school.edu'),
      ).rejects.toBeInstanceOf(ValidationException);

      expect(invitationRepository.updateStatus).not.toHaveBeenCalled();
      expect(classroomRepository.addStudent).not.toHaveBeenCalled();
    });
  });

  describe('resendInvitation', () => {
    it('regenera el token y reenvia el correo para invitaciones pendientes', async () => {
      const pendingInvitation = buildInvitation({ message: 'Mensaje original' });
      const classroom = buildClassroom({ invitedStudentEmails: [] });
      invitationRepository.findById.mockResolvedValue(pendingInvitation);
      classroomRepository.findById.mockResolvedValue(classroom);
      const newExpiration = new Date('2030-01-01T00:00:00Z');

      const tokenSpy = jest.spyOn<any, any>(service as any, 'generateToken');
      tokenSpy.mockReturnValue('new-token');
      const expirationSpy = jest.spyOn<any, any>(service as any, 'calculateExpirationDate');
      expirationSpy.mockReturnValue(newExpiration);
      emailService.sendClassroomInvitationEmail.mockResolvedValue(true);

      const result = await service.resendInvitation('classroom-1', 'invitation-1', 'teacher-1', {
        message: 'Mensaje actualizado',
        redirectUrl: 'https://app.acalud.dev/invite?from=panel',
      });

      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith('classroom-1', 'teacher-1');
      expect(invitationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 'invitation-1',
        token: 'new-token',
        status: InvitationStatus.PENDING,
        invitedById: 'teacher-1',
        expiresAt: newExpiration,
        message: 'Mensaje actualizado',
      }));
      expect(classroomRepository.update).toHaveBeenCalledWith('classroom-1', expect.objectContaining({
        invitedStudentEmails: expect.arrayContaining(['student@school.edu']),
      }));
      expect(emailService.sendClassroomInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({
        email: 'student@school.edu',
        inviteLink: expect.stringContaining('new-token'),
        message: 'Mensaje actualizado',
      }));
      expect(result.token).toBe('new-token');

      tokenSpy.mockRestore();
      expirationSpy.mockRestore();
    });

    it('lanza ValidationException cuando la invitación ya fue aceptada', async () => {
      invitationRepository.findById.mockResolvedValue(buildInvitation({ status: InvitationStatus.ACCEPTED }));

      await expect(
        service.resendInvitation('classroom-1', 'invitation-1', 'teacher-1'),
      ).rejects.toBeInstanceOf(ValidationException);

      expect(invitationRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendClassroomInvitationEmail).not.toHaveBeenCalled();
    });

    it('lanza ResourceNotFoundException cuando no existe la invitación', async () => {
      invitationRepository.findById.mockResolvedValue(null);

      await expect(
        service.resendInvitation('classroom-1', 'invitation-inexistente', 'teacher-1'),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      expect(invitationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('revokeInvitation', () => {
    it('revoca invitaciones pendientes y actualiza el aula', async () => {
      const invitation = buildInvitation();
      invitationRepository.findById.mockResolvedValue(invitation);
      invitationRepository.updateStatus.mockResolvedValue(buildInvitation({ status: InvitationStatus.REVOKED }));
      classroomRepository.findById.mockResolvedValue(buildClassroom({ invitedStudentEmails: [invitation.email] }));

      const result = await service.revokeInvitation('classroom-1', 'invitation-1', 'teacher-1');

      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith('classroom-1', 'teacher-1');
      expect(invitationRepository.updateStatus).toHaveBeenCalledWith(
        'invitation-1',
        InvitationStatus.REVOKED,
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
      expect(classroomRepository.update).toHaveBeenCalledWith('classroom-1', expect.objectContaining({
        invitedStudentEmails: [],
      }));
      expect(result.status).toBe(InvitationStatus.REVOKED);
    });

    it('lanza ValidationException al revocar invitaciones aceptadas', async () => {
      invitationRepository.findById.mockResolvedValue(buildInvitation({ status: InvitationStatus.ACCEPTED }));

      await expect(
        service.revokeInvitation('classroom-1', 'invitation-1', 'teacher-1'),
      ).rejects.toBeInstanceOf(ValidationException);

      expect(invitationRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('lanza ResourceNotFoundException cuando no existe la invitación', async () => {
      invitationRepository.findById.mockResolvedValue(null);

      await expect(
        service.revokeInvitation('classroom-1', 'invitation-10', 'teacher-1'),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      expect(invitationRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
});
