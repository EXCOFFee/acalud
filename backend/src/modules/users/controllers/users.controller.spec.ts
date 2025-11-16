import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { User } from '../user.entity';

const buildRequest = (id = 'user-id') => ({
  user: { id },
});

const buildFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'avatar',
  originalname: 'avatar.png',
  encoding: '7bit',
  mimetype: 'image/png',
  size: 1024,
  destination: './uploads/avatars',
  filename: 'avatar.png',
  path: './uploads/avatars/avatar.png',
  buffer: Buffer.from('avatar'),
  stream: null as any,
  ...overrides,
});

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateAvatar: jest.fn(),
            remove: jest.fn(),
            getUserStats: jest.fn(),
            getExperienceRanking: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(UsersController);
    service = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('crea un usuario delegando la operación en el servicio', async () => {
    const payload = { email: 'user@test.com' } as any;
    const user = { id: 'user-1' } as User;
    service.create.mockResolvedValue(user);

    const result = await controller.create(payload);

    expect(service.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(user);
  });

  it('normaliza los parámetros de paginación en findAll', async () => {
    const response = { users: [], pagination: { page: 1, limit: 50 } } as any;
    service.findAll.mockResolvedValue(response);

    const result = await controller.findAll('0' as any, '120' as any, 'teacher', 'john');

    expect(service.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      role: 'teacher',
      search: 'john',
    });
    expect(result).toBe(response);
  });

  it('obtiene el perfil del usuario autenticado', async () => {
    const user = { id: 'user-2' } as User;
    service.findById.mockResolvedValue(user);

    const result = await controller.getProfile(buildRequest('user-2'));

    expect(service.findById).toHaveBeenCalledWith('user-2');
    expect(result).toBe(user);
  });

  it('obtiene un usuario por id', async () => {
    const user = { id: 'user-3' } as User;
    service.findById.mockResolvedValue(user);

    const result = await controller.findOne('user-3');

    expect(service.findById).toHaveBeenCalledWith('user-3');
    expect(result).toBe(user);
  });

  it('actualiza el perfil del usuario autenticado', async () => {
    const updated = { id: 'user-4', firstName: 'Nuevo' } as User;
    service.update.mockResolvedValue(updated);

    const result = await controller.updateProfile(buildRequest('user-4'), { firstName: 'Nuevo' } as any);

    expect(service.update).toHaveBeenCalledWith('user-4', { firstName: 'Nuevo' });
    expect(result).toBe(updated);
  });

  it('lanza BadRequestException si no se adjunta archivo al actualizar avatar', async () => {
    await expect(controller.updateAvatar(buildRequest('user-5'), null as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualiza el avatar delegando en el servicio', async () => {
    const response = { id: 'user-6', avatar: '/uploads/avatars/avatar.png' } as any;
    service.updateAvatar.mockResolvedValue(response);
    const file = buildFile();

    const result = await controller.updateAvatar(buildRequest('user-6'), file);

    expect(service.updateAvatar).toHaveBeenCalledWith('user-6', file);
    expect(result).toBe(response);
  });

  it('actualiza un usuario por id', async () => {
    const updated = { id: 'user-7', lastName: 'Actualizado' } as User;
    service.update.mockResolvedValue(updated);

    const result = await controller.update('user-7', { lastName: 'Actualizado' } as any);

    expect(service.update).toHaveBeenCalledWith('user-7', { lastName: 'Actualizado' });
    expect(result).toBe(updated);
  });

  it('elimina un usuario delegando en el servicio', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('user-8');

    expect(service.remove).toHaveBeenCalledWith('user-8');
  });

  it('obtiene estadísticas de usuario', async () => {
    const stats = { totalActivitiesCompleted: 5 } as any;
    service.getUserStats.mockResolvedValue(stats);

    const result = await controller.getUserStats('user-9');

    expect(service.getUserStats).toHaveBeenCalledWith('user-9');
    expect(result).toBe(stats);
  });

  it('normaliza el límite del ranking de experiencia', async () => {
    const ranking = [{ id: 'user-1', rank: 1 }];
    service.getExperienceRanking.mockResolvedValue(ranking as any);

    const highLimit = await controller.getExperienceRanking('150' as any);
    expect(service.getExperienceRanking).toHaveBeenLastCalledWith(100);
    expect(highLimit).toBe(ranking as any);

    const lowLimit = await controller.getExperienceRanking('0' as any);
    expect(service.getExperienceRanking).toHaveBeenLastCalledWith(1);
    expect(lowLimit).toBe(ranking as any);
  });
});
