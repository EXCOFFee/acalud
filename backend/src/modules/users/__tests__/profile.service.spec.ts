import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProfileService } from '../services/profile.service';
import { ProfileAuditService } from '../services/profile-audit.service';
import { UserProfile } from '../entities/user-profile.entity';
import { User } from '../user.entity';
import {
  ProfileAuditOperation,
  UserProfileAudit,
} from '../entities/user-profile-audit.entity';

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('ProfileService (audit behaviour)', () => {
  let service: ProfileService;
  let profileRepository: jest.Mocked<Repository<UserProfile>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let auditRepository: jest.Mocked<Repository<UserProfileAudit>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        ProfileAuditService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(UserProfileAudit),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
    profileRepository = moduleRef.get(getRepositoryToken(UserProfile));
    userRepository = moduleRef.get(getRepositoryToken(User));
    auditRepository = moduleRef.get(getRepositoryToken(UserProfileAudit));

    profileRepository.create.mockImplementation((input) => input as UserProfile);
    profileRepository.save.mockImplementation(async (entity) => entity as UserProfile);
    auditRepository.create.mockImplementation((input) => input as UserProfileAudit);
    auditRepository.save.mockImplementation(async (entity) => entity as UserProfileAudit);

    jest.clearAllMocks();
  });

  it('registra un evento de auditoría al crear un perfil', async () => {
    const userId = 'user-1';
    const user = { id: userId, name: 'Jane Doe' } as User;

    userRepository.findOne.mockResolvedValue(user);
    profileRepository.findOne.mockResolvedValue(null);

    await service.createProfile(userId, { displayName: 'Jane Doe' });

    expect(auditRepository.save).toHaveBeenCalledTimes(1);
    const auditEntry = auditRepository.save.mock.calls[0][0];

    expect(auditEntry.userId).toBe(userId);
    expect(auditEntry.operation).toBe(ProfileAuditOperation.PROFILE_CREATED);
    expect(auditEntry.changes.displayName.current).toBe('Jane Doe');
  });

  it('registra cambios específicos al actualizar un perfil', async () => {
    const userId = 'user-2';
    const user = { id: userId, name: 'John Teacher' } as User;
    const existingProfile = {
      userId,
      user,
      displayName: 'Nombre anterior',
      bio: 'Bio inicial',
      privacySettings: {},
      notificationSettings: {},
      accessibilitySettings: {},
      stats: {},
      isPublic: true,
      featuredAchievements: [],
      customBadges: [],
    } as unknown as UserProfile;

    profileRepository.findOne.mockResolvedValue(existingProfile);

    await service.updateProfile(userId, { displayName: 'Nombre nuevo' }, userId);

    expect(auditRepository.save).toHaveBeenCalledTimes(1);
    const auditEntry = auditRepository.save.mock.calls[0][0];

    expect(auditEntry.operation).toBe(ProfileAuditOperation.PROFILE_UPDATED);
    expect(auditEntry.changes.displayName.previous).toBe('Nombre anterior');
    expect(auditEntry.changes.displayName.current).toBe('Nombre nuevo');
  });

  it('registra auditoría al actualizar estadísticas', async () => {
    const userId = 'user-3';
    const profile = {
      userId,
      user: { id: userId } as User,
      stats: { activitiesCompleted: 1 },
      privacySettings: {},
      notificationSettings: {},
      accessibilitySettings: {},
      featuredAchievements: [],
      customBadges: [],
      isPublic: true,
      updateStats(updates: Record<string, number>) {
        this.stats = { ...this.stats, ...updates };
      },
    } as unknown as UserProfile;

    profileRepository.findOne.mockResolvedValue(profile);

    await service.updateStats(userId, { activitiesCompleted: 5 });

    expect(auditRepository.save).toHaveBeenCalledTimes(1);
    const auditEntry = auditRepository.save.mock.calls[0][0];

    expect(auditEntry.operation).toBe(ProfileAuditOperation.STATS_UPDATED);
    const previousStats = auditEntry.changes.stats.previous as Record<string, number>;
    const currentStats = auditEntry.changes.stats.current as Record<string, number>;
    expect(previousStats.activitiesCompleted).toBe(1);
    expect(currentStats.activitiesCompleted).toBe(5);
  });

  it('impide editar perfiles de terceros y no registra auditoría', async () => {
    const ownerId = 'owner-1';
    const attackerId = 'intruder-99';
    const profile = {
      userId: ownerId,
      user: { id: ownerId } as User,
      privacySettings: {},
      notificationSettings: {},
      accessibilitySettings: {},
      stats: {},
      featuredAchievements: [],
      customBadges: [],
      isPublic: true,
    } as unknown as UserProfile;

    profileRepository.findOne.mockResolvedValue(profile);

    await expect(
      service.updateProfile(ownerId, { displayName: 'Hacking attempt' }, attackerId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(auditRepository.save).not.toHaveBeenCalled();
  });
});
