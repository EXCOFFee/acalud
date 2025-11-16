import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { UsersService } from '../users.service';
import { User, UserRole } from '../user.entity';
import { UpdateAvatarResponseDto } from '../dto/update-avatar-response.dto';
import * as bcrypt from 'bcrypt';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');

  return {
    ...actualFs,
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createQueryBuilderMock = () => ({
  select: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
});

describe('UsersService.updateAvatar', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;
  const fsMock = fs as jest.Mocked<typeof fs>;

  const userId = 'user-uuid';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');

  const buildUser = (overrides: Partial<User> = {}): User => {
    return Object.assign(new User(), {
      id: userId,
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      role: UserRole.TEACHER,
      avatar: null,
      password: 'hashed',
      coins: 0,
      level: 1,
      experience: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {},
      ownedClassrooms: [],
      enrolledClassrooms: [],
      achievements: [],
      ...overrides,
    });
  };

  const buildFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'avatar',
    originalname: 'avatar.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    destination: uploadsDir,
    filename: 'avatar-test.png',
    path: path.join(uploadsDir, 'avatar-test.png'),
    stream: null as any,
    buffer: Buffer.from('test'),
    ...overrides,
  });

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    service = new UsersService(userRepository as unknown as Repository<User>);

    fsMock.existsSync.mockReturnValue(false);
    fsMock.unlinkSync.mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('actualiza el avatar y retorna la respuesta esperada', async () => {
    const user = buildUser();
    const file = buildFile();

    (userRepository.findOne as jest.Mock).mockResolvedValue(user);
    (userRepository.update as jest.Mock).mockResolvedValue(undefined);

    const result = await service.updateAvatar(userId, file);

    expect(userRepository.update).toHaveBeenCalledWith(userId, {
      avatar: `/uploads/avatars/${file.filename}`,
    });

    const expected: UpdateAvatarResponseDto = {
      id: userId,
      avatar: `/uploads/avatars/${file.filename}`,
      message: 'Avatar actualizado exitosamente',
    };

    expect(result).toEqual(expected);
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    const file = buildFile();
    (userRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.updateAvatar(userId, file)).rejects.toBeInstanceOf(NotFoundException);
    expect(fsMock.unlinkSync).not.toHaveBeenCalled();
  });

  it('lanza BadRequestException si el tipo de archivo no es permitido', async () => {
    const user = buildUser();
    const file = buildFile({ mimetype: 'application/pdf' });
    (userRepository.findOne as jest.Mock).mockResolvedValue(user);
    fsMock.existsSync.mockReturnValueOnce(true);

    await expect(service.updateAvatar(userId, file)).rejects.toBeInstanceOf(BadRequestException);
    expect(fsMock.unlinkSync).toHaveBeenCalledWith(file.path);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('lanza BadRequestException si el archivo excede el limite de 2MB', async () => {
    const user = buildUser();
    const file = buildFile({ size: 3 * 1024 * 1024 });
    (userRepository.findOne as jest.Mock).mockResolvedValue(user);

    await expect(service.updateAvatar(userId, file)).rejects.toBeInstanceOf(BadRequestException);
    expect(fsMock.unlinkSync).toHaveBeenCalledWith(file.path);
  });

  it('elimina avatar previo cuando existe', async () => {
    const file = buildFile();
    const previousAvatar = '/uploads/avatars/old.png';
    const user = buildUser({ avatar: previousAvatar });

    (userRepository.findOne as jest.Mock).mockResolvedValue(user);
    (userRepository.update as jest.Mock).mockResolvedValue(undefined);

    fsMock.existsSync.mockReturnValueOnce(true);

    const result = await service.updateAvatar(userId, file);

    expect(fsMock.existsSync).toHaveBeenCalled();
    expect(fsMock.unlinkSync).toHaveBeenCalledWith(path.join(process.cwd(), previousAvatar.replace(/^\//, '')));
    expect(result.avatar).toContain(file.filename);
  });
});

describe('UsersService business rules', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;

  const buildCreateDto = () => ({
    email: 'Docente@Acalud.com',
    password: 'Docente123!',
    firstName: 'Docente',
    lastName: 'Acalud',
    role: UserRole.TEACHER,
  });

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    service = new UsersService(userRepository as unknown as Repository<User>);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('crea un usuario normalizando email y ocultando la contraseña', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValue('hashed-secret');

      const created = { id: 'user-77', password: 'hashed-secret', email: 'docente@acalud.com' } as User;
      (userRepository.create as jest.Mock).mockReturnValue(created);
      (userRepository.save as jest.Mock).mockResolvedValue({ ...created });

      const result = await service.create(buildCreateDto());

      expect(hashMock).toHaveBeenCalledWith('Docente123!', 10);
      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'docente@acalud.com',
        password: 'hashed-secret',
      }));
      expect(result).toEqual(expect.objectContaining({ id: 'user-77', email: 'docente@acalud.com' }));
      expect(result.password).toBeUndefined();
    });

    it('lanza ConflictException cuando el email ya existe', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: 'user-1' });

      await expect(service.create(buildCreateDto())).rejects.toBeInstanceOf(ConflictException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('lanza InternalServerErrorException si ocurre un error inesperado', async () => {
  (userRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
  const hashMock = bcrypt.hash as jest.Mock;
  hashMock.mockResolvedValue('hashed-secret');
      const createdUser = { id: 'user-77', password: 'hashed-secret' } as User;
      (userRepository.create as jest.Mock).mockReturnValue(createdUser);
      (userRepository.save as jest.Mock).mockRejectedValue(new Error('db down'));

      await expect(service.create(buildCreateDto())).rejects.toBeInstanceOf(InternalServerErrorException);

  expect(hashMock).toHaveBeenCalledWith('Docente123!', 10);
    });
  });

  describe('findAll', () => {
    it('aplica filtros de rol y búsqueda con paginación', async () => {
      const queryBuilder = createQueryBuilderMock();
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilder);
      queryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'user-1' } as User], 1]);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        role: UserRole.TEACHER,
        search: 'John',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.TEACHER });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: '%John%' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('omite filtro de rol cuando no es válido', async () => {
      const queryBuilder = createQueryBuilderMock();
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilder);
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 10, role: 'invalid-role', search: undefined });

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith('user.role = :role', expect.anything());
    });
  });

  describe('findById', () => {
    it('lanza NotFoundException cuando el usuario no existe', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('missing-user')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retorna el usuario cuando existe', async () => {
      const user = { id: 'user-123' } as User;
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findById('user-123');

      expect(result).toBe(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Array),
        relations: ['ownedClassrooms', 'enrolledClassrooms', 'achievements'],
      });
    });
  });

  describe('findByEmailWithPassword', () => {
    it('retorna usuario con contraseña para autenticación', async () => {
      const user = { id: 'user-10', password: 'hash' } as User;
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findByEmailWithPassword('mail@test.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'mail@test.com' },
        select: expect.arrayContaining(['password']),
      });
      expect(result).toBe(user);
    });
  });

  describe('update', () => {
    it('actualiza los datos del usuario cuando no hay cambios de email', async () => {
      const existingUser = { id: 'user-1', email: 'old@acalud.com' } as User;
      const updatedUser = { ...existingUser, firstName: 'Nuevo' } as User;
      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.update('user-1', { firstName: 'Nuevo' } as any);

      expect(userRepository.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ firstName: 'Nuevo' }));
      expect(result).toBe(updatedUser);

      findByIdSpy.mockRestore();
    });

    it('hashea la contraseña cuando se actualiza', async () => {
      const user = { id: 'user-2', email: 'user@test.com' } as User;
      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(user);

      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValueOnce('new-hash');

      await service.update('user-2', { password: 'NewPass123!' } as any);

      expect(hashMock).toHaveBeenCalledWith('NewPass123!', 12);
      expect(userRepository.update).toHaveBeenCalledWith('user-2', expect.objectContaining({ password: 'new-hash' }));

      findByIdSpy.mockRestore();
    });

    it('lanza ConflictException cuando el nuevo email ya está ocupado', async () => {
      const existingUser = { id: 'user-1', email: 'original@acalud.com' } as User;
      const conflictUser = { id: 'user-2', email: 'nuevo@acalud.com' } as User;
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue(existingUser);
      (userRepository.findOne as jest.Mock).mockResolvedValue(conflictUser);

      await expect(service.update('user-1', { email: 'nuevo@acalud.com' } as any)).rejects.toBeInstanceOf(ConflictException);

      findByIdSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('desactiva el usuario en lugar de eliminarlo', async () => {
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue({ id: 'user-remove' } as User);

      await service.remove('user-remove');

      expect(userRepository.update).toHaveBeenCalledWith('user-remove', { isActive: false });
      findByIdSpy.mockRestore();
    });
  });

  describe('getUserStats', () => {
    it('calcula métricas agregadas del usuario', async () => {
      const completions = [
        {
          score: 80,
          timeSpent: 300,
          completedAt: new Date('2024-01-02'),
          activity: { title: 'Matemáticas' },
        },
        {
          score: 60,
          timeSpent: 200,
          completedAt: new Date('2024-01-01'),
          activity: { title: 'Historia' },
        },
      ];

      (userRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'user-stats',
        experience: 1200,
        level: 6,
        coins: 250,
        achievements: [{ id: 'a1' }],
        ownedClassrooms: [{ id: 'c1' }],
        enrolledClassrooms: [{ id: 'c2' }, { id: 'c3' }],
        activityCompletions: completions,
      });

      const stats = await service.getUserStats('user-stats');

      expect(stats.totalActivitiesCompleted).toBe(2);
      expect(stats.averageScore).toBe(70);
      expect(stats.totalTimeSpent).toBe(500);
      expect(stats.recentActivities[0].activityTitle).toBe('Matemáticas');
      expect(stats.classroomsAsStudent).toBe(2);
      expect(stats.classroomsAsTeacher).toBe(1);
    });
  });

  describe('getExperienceRanking', () => {
    it('agrega posición a cada usuario', async () => {
      (userRepository.find as jest.Mock).mockResolvedValue([
        { id: 'user-1', experience: 200 },
        { id: 'user-2', experience: 150 },
      ]);

      const ranking = await service.getExperienceRanking(10);

      expect(userRepository.find).toHaveBeenCalledWith({
        select: expect.arrayContaining(['experience']),
        where: { isActive: true },
        order: { experience: 'DESC', level: 'DESC' },
        take: 10,
      });
      expect(ranking).toEqual([
        expect.objectContaining({ id: 'user-1', rank: 1 }),
        expect.objectContaining({ id: 'user-2', rank: 2 }),
      ]);
    });
  });

  describe('updateExperience', () => {
    it('actualiza experiencia y recalcula nivel', async () => {
      const user = { id: 'user-exp', experience: 200 } as User;
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue(user);

      await service.updateExperience('user-exp', 50);

      expect(userRepository.update).toHaveBeenCalledWith('user-exp', {
        experience: 250,
        level: 2,
      });
      findByIdSpy.mockRestore();
    });
  });

  describe('updateCoins', () => {
    it('evita que el saldo quede negativo', async () => {
      const user = { id: 'user-coins', coins: 5 } as User;
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue(user);

      await service.updateCoins('user-coins', -10);

      expect(userRepository.update).toHaveBeenCalledWith('user-coins', {
        coins: 0,
      });
      findByIdSpy.mockRestore();
    });
  });

  describe('canAccessClassroom', () => {
    it('retorna false cuando el usuario no existe', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.canAccessClassroom('user-404', 'classroom-1')).resolves.toBe(false);
    });

    it('retorna true cuando es propietario del aula', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue({
        ownedClassrooms: [{ id: 'classroom-1' }],
        enrolledClassrooms: [],
      });

      await expect(service.canAccessClassroom('user-1', 'classroom-1')).resolves.toBe(true);
    });

    it('retorna true cuando está inscrito en el aula', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue({
        ownedClassrooms: [],
        enrolledClassrooms: [{ id: 'classroom-2' }],
      });

      await expect(service.canAccessClassroom('user-1', 'classroom-2')).resolves.toBe(true);
    });
  });
});
