import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { PasswordRecoveryService } from './password-recovery.service';
import { PasswordRecovery, TokenStatus, TokenType } from '../entities/password-recovery.entity';
import { User } from '../../users/user.entity';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

const createQueryBuilderMock = () => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue(undefined),
});

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let passwordRecoveryRepository: jest.Mocked<Repository<PasswordRecovery>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let emailService: jest.Mocked<EmailService>;
  let queryBuilder: ReturnType<typeof createQueryBuilderMock>;

  const configService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'FRONTEND_URL') {
        return 'http://localhost:5173';
      }
      return defaultValue;
    }),
  } as unknown as ConfigService;

  beforeEach(async () => {
    queryBuilder = createQueryBuilderMock();

    passwordRecoveryRepository = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<PasswordRecovery>>;

    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    emailService = {
      sendPasswordResetEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordRecoveryService,
        { provide: getRepositoryToken(PasswordRecovery), useValue: passwordRecoveryRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

  service = module.get<PasswordRecoveryService>(PasswordRecoveryService);
  service['config'].tokenLength = 4; // Reducir tamaño para las pruebas
  service['config'].saltRounds = 4; // Reducir costo de hash para las pruebas
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildRecovery = (overrides: Partial<PasswordRecovery> = {}): PasswordRecovery => {
    return new PasswordRecovery({
      id: overrides.id ?? 'recovery-1',
      token: overrides.token ?? 'test-token',
      type: overrides.type ?? TokenType.PASSWORD_RESET,
      status: overrides.status ?? TokenStatus.ACTIVE,
      expiresAt:
        overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      attemptCount: overrides.attemptCount ?? 0,
      user:
        overrides.user ??
        ({
          id: 'user-1',
          email: 'user@example.com',
          password: overrides.user?.password ?? 'hashed-password',
          isActive: true,
        } as User),
    });
  };

  it('genera un token y envía el correo de recuperación', async () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'User', password: 'hash', isActive: true } as User;

    userRepository.findOne.mockResolvedValue(user);
    passwordRecoveryRepository.count.mockResolvedValue(0);
    passwordRecoveryRepository.create.mockImplementation((entity: any) => ({ id: 'recovery-1', ...entity }));
  passwordRecoveryRepository.save.mockImplementation(async (entity: any) => entity as PasswordRecovery);
    emailService.sendPasswordResetEmail.mockResolvedValue(true);

    const result = await service.requestPasswordReset({
      email: user.email,
      clientIp: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.success).toBe(true);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ user, token: expect.any(String) }),
    );
    expect(passwordRecoveryRepository.save).toHaveBeenCalled();
  });

  it('responde con éxito aunque el usuario no exista', async () => {
    userRepository.findOne.mockResolvedValue(null);

    const result = await service.requestPasswordReset({ email: 'ghost@example.com' });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Si el email existe');
  });

  it('marca el token como fallido cuando el email no se envía', async () => {
    const user = { id: 'user-1', email: 'user@example.com', password: 'hash', isActive: true } as User;

    userRepository.findOne.mockResolvedValue(user);
    passwordRecoveryRepository.count.mockResolvedValue(0);
    passwordRecoveryRepository.create.mockReturnValue({ id: 'recovery-1' } as any);
    passwordRecoveryRepository.save.mockResolvedValue({ id: 'recovery-1' } as any);
    emailService.sendPasswordResetEmail.mockResolvedValue(false);

    await expect(
      service.requestPasswordReset({ email: user.email }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(passwordRecoveryRepository.update).toHaveBeenCalledWith(
      'recovery-1',
      expect.objectContaining({ status: TokenStatus.EXPIRED }),
    );
  });

  it('lanza BadRequest cuando el token no existe', async () => {
    passwordRecoveryRepository.findOne.mockResolvedValue(null);

    await expect(
      service.validateToken({ token: 'invalid-token' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revoca tokens expirados al validar', async () => {
    const recovery = buildRecovery({ expiresAt: new Date(Date.now() - 1000) });
    passwordRecoveryRepository.findOne.mockResolvedValue(recovery);
    passwordRecoveryRepository.save.mockResolvedValue(recovery);

    await expect(
      service.validateToken({ token: recovery.token }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(passwordRecoveryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ attemptCount: 1 }),
    );
  });

  it('resetea la contraseña con un token válido', async () => {
    const hashedPassword = await bcrypt.hash('CLaveAnterior1!', 4);
    const recovery = buildRecovery({ user: { id: 'user-1', email: 'user@example.com', password: hashedPassword } as User });

    passwordRecoveryRepository.findOne.mockResolvedValue(recovery);
    passwordRecoveryRepository.save.mockResolvedValue(recovery);
    emailService.sendPasswordResetEmail.mockResolvedValue(true);

    await expect(
      service.resetPassword({
        token: recovery.token,
        newPassword: 'NuevaClave1!',
        confirmPassword: 'NuevaClave1!',
      }),
    ).resolves.toEqual({ success: true, message: 'Contraseña actualizada exitosamente.', data: { userId: 'user-1' } });

    expect(userRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ password: expect.any(String) }),
    );
    expect(passwordRecoveryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TokenStatus.USED }),
    );
    expect(queryBuilder.execute).toHaveBeenCalled();
  });
});
