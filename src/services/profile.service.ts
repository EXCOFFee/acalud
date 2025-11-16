// ============================================================================
// 👤 SERVICIO DE PERFIL - ACALUD - CONEXIÓN CON ENDPOINTS DEL BACKEND
// ============================================================================
import { httpClient, HttpError } from './http.service';
import {
  PaginatedResponse,
  ProfileAccessibilitySettings,
  ProfileNotificationSettings,
  ProfileOperationResult,
  ProfilePrivacyLevel,
  ProfilePrivacySettings,
  ProfileStats,
  ProfileTheme,
  UserProfileEntity,
} from '../types';

const DEFAULT_PRIVACY_SETTINGS: Required<ProfilePrivacySettings> = {
  showEmail: false,
  showBirthDate: true,
  showLocation: true,
  showSocialLinks: true,
  showStats: true,
  allowMessages: true,
  allowFriendRequests: true,
};

const DEFAULT_NOTIFICATION_SETTINGS: Required<ProfileNotificationSettings> = {
  email: true,
  push: true,
  in_app: true,
  newMessages: true,
  classroomUpdates: true,
  activityReminders: true,
  achievementUnlocked: true,
  friendRequests: true,
  weeklyDigest: false,
};

const DEFAULT_STATS: Required<ProfileStats> = {
  activitiesCompleted: 0,
  classroomsJoined: 0,
  badgesEarned: 0,
  pointsEarned: 0,
  streakDays: 0,
  totalStudyTime: 0,
  averageScore: 0,
  favoritesCount: 0,
  followersCount: 0,
  followingCount: 0,
};

export interface CreateProfileInput {
  displayName?: string;
  bio?: string;
  birthDate?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  theme?: ProfileTheme;
  language?: string;
  privacyLevel?: ProfilePrivacyLevel;
}

export type UpdateProfileInput = Partial<CreateProfileInput> & {
  privacySettings?: ProfilePrivacySettings;
  notificationSettings?: ProfileNotificationSettings;
  accessibilitySettings?: ProfileAccessibilitySettings;
  primaryColor?: string;
  fontSettings?: {
    size?: 'small' | 'medium' | 'large';
    family?: string;
  };
  featuredAchievements?: string[];
};

export type UpdateStatsInput = Partial<ProfileStats>;

export interface SearchProfilesFilters {
  displayName?: string;
  location?: string;
  theme?: ProfileTheme;
  language?: string;
  isVerified?: boolean;
  hasAvatar?: boolean;
  minLevel?: number;
  page?: number;
  limit?: number;
}

export class ProfileService {
  private static instance: ProfileService;

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  private constructor() {}

  private normalizeProfile(profile: UserProfileEntity): UserProfileEntity {
    return {
      ...profile,
      socialLinks: profile.socialLinks ?? {},
      privacySettings: { ...DEFAULT_PRIVACY_SETTINGS, ...(profile.privacySettings ?? {}) },
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(profile.notificationSettings ?? {}),
      },
      accessibilitySettings: profile.accessibilitySettings ?? {},
      stats: { ...DEFAULT_STATS, ...(profile.stats ?? {}) },
      featuredAchievements: profile.featuredAchievements ?? [],
      customBadges: profile.customBadges ?? [],
    };
  }

  private extractProfile(result: ProfileOperationResult): UserProfileEntity {
    if (!result.profile) {
      throw new Error('La operación no devolvió un perfil actualizado.');
    }
    return this.normalizeProfile(result.profile);
  }

  async getMyProfile(): Promise<UserProfileEntity> {
    const profile = await httpClient.get<UserProfileEntity>('/users/profiles/me');
    return this.normalizeProfile(profile);
  }

  async ensureMyProfile(): Promise<UserProfileEntity> {
    try {
      return await this.getMyProfile();
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        await httpClient.post<ProfileOperationResult>('/users/profiles', {});
        return this.getMyProfile();
      }
      throw error;
    }
  }

  async updateMyProfile(payload: UpdateProfileInput): Promise<UserProfileEntity> {
    const result = await httpClient.put<ProfileOperationResult, UpdateProfileInput>(
      '/users/profiles/me',
      payload,
    );
    return this.extractProfile(result);
  }

  async updateMyPrivacy(payload: ProfilePrivacySettings & { privacyLevel?: ProfilePrivacyLevel }): Promise<UserProfileEntity> {
    const result = await httpClient.put<ProfileOperationResult, Partial<UpdateProfileInput>>(
      '/users/profiles/me',
      {
        privacyLevel: payload.privacyLevel,
        privacySettings: payload,
      },
    );
    return this.extractProfile(result);
  }

  async updateMyNotifications(payload: ProfileNotificationSettings): Promise<UserProfileEntity> {
    const result = await httpClient.put<ProfileOperationResult, Partial<UpdateProfileInput>>(
      '/users/profiles/me',
      {
        notificationSettings: payload,
      },
    );
    return this.extractProfile(result);
  }

  async updateMyAccessibility(payload: ProfileAccessibilitySettings): Promise<UserProfileEntity> {
    const result = await httpClient.put<ProfileOperationResult, Partial<UpdateProfileInput>>(
      '/users/profiles/me',
      {
        accessibilitySettings: payload,
      },
    );
    return this.extractProfile(result);
  }

  async updateMyStats(payload: UpdateStatsInput): Promise<void> {
    await httpClient.put('/users/profiles/me/stats', payload);
  }

  async deleteMyProfile(): Promise<void> {
    await httpClient.delete('/users/profiles/me');
  }

  async getProfileById(userId: string): Promise<UserProfileEntity> {
    const profile = await httpClient.get<UserProfileEntity>(`/users/profiles/${userId}`);
    return this.normalizeProfile(profile);
  }

  async searchProfiles(filters: SearchProfilesFilters): Promise<PaginatedResponse<UserProfileEntity>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params.append(key, String(value));
    });
    const query = params.toString();
    const response = await httpClient.get<PaginatedResponse<UserProfileEntity>>(
      `/users/profiles${query ? `?${query}` : ''}`,
    );
    return {
      ...response,
      data: response.data.map((profile) => this.normalizeProfile(profile)),
    };
  }
}

export const profileService = ProfileService.getInstance();
