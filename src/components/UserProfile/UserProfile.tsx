// ============================================================================
// PERFIL DE USUARIO
// ============================================================================
// Interfaz para gestionar información personal y configuraciones

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Lock,
  Camera,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  Calendar,
  Trophy,
  Target,
  Flame,
  Star,
  Settings,
  Bell,
  Shield,
  ArrowLeft,
  Check,
  AlertCircle,
  Trash2
} from 'lucide-react';

/**
 * Props del componente UserProfile
 */
interface UserProfileProps {
  onBack: () => void;
}

/**
 * Información del perfil del usuario
 */
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  school?: string;
  grade?: string;
  bio?: string;
  avatar?: string;
  joinedAt: Date;
}

/**
 * Estadísticas del usuario
 */
interface UserStats {
  totalActivities: number;
  completedActivities: number;
  averageScore: number;
  currentStreak: number;
  totalTimeStudied: number; // en minutos
  achievementsUnlocked: number;
  coinsEarned: number;
  level: number;
}

/**
 * Configuraciones de notificaciones
 */
interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  activityReminders: boolean;
  achievementAlerts: boolean;
  weeklyReports: boolean;
}

/**
 * Configuraciones de privacidad
 */
interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showStats: boolean;
  showAchievements: boolean;
  allowMessages: boolean;
}

/**
 * Componente del perfil de usuario
 * Permite editar información personal, ver estadísticas y configurar ajustes
 */
export const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'settings'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para datos del usuario
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    activityReminders: true,
    achievementAlerts: true,
    weeklyReports: false
  });
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'friends',
    showStats: true,
    showAchievements: true,
    allowMessages: true
  });

  // Estados para formularios
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });

  /**
   * Cargar datos del usuario
   */
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // Simular datos del usuario (en producción vendría del backend)
        const mockProfile: UserProfile = {
          id: user.id,
          firstName: user.firstName || 'Usuario',
          lastName: user.lastName || 'Estudiante',
          email: user.email,
          dateOfBirth: '2005-06-15',
          phone: '+51 987 654 321',
          address: 'Lima, Perú',
          school: 'Colegio Nacional',
          grade: '5to Secundaria',
          bio: 'Estudiante apasionado por aprender y crecer cada día.',
          joinedAt: new Date('2024-01-15')
        };

        const mockStats: UserStats = {
          totalActivities: 45,
          completedActivities: 38,
          averageScore: 85.5,
          currentStreak: 7,
          totalTimeStudied: 720, // 12 horas
          achievementsUnlocked: 12,
          coinsEarned: 450,
          level: 3
        };

        setUserProfile(mockProfile);
        setUserStats(mockStats);
        setProfileForm(mockProfile);

      } catch (error) {
        console.error('Error al cargar perfil:', error);
        setError('Error al cargar el perfil. Intenta recargar la página.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  /**
   * Manejar cambios en el formulario de perfil
   */
  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Guardar cambios del perfil
   */
  const saveProfileChanges = async () => {
    if (!userProfile) return;

    try {
      setError(null);
      
      // Validaciones básicas
      if (!profileForm.firstName?.trim() || !profileForm.lastName?.trim()) {
        setError('El nombre y apellido son obligatorios.');
        return;
      }

      if (profileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
        setError('El formato del email no es válido.');
        return;
      }

      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedProfile = {
        ...userProfile,
        ...profileForm
      };

      setUserProfile(updatedProfile);
      setIsEditing(false);
      setSuccessMessage('Perfil actualizado correctamente.');

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Error al guardar perfil:', error);
      setError('Error al guardar los cambios. Intenta de nuevo.');
    }
  };

  /**
   * Cambiar contraseña
   */
  const changePassword = async () => {
    try {
      setError(null);

      // Validaciones
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setError('Todos los campos de contraseña son obligatorios.');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      // Simular cambio de contraseña
      await new Promise(resolve => setTimeout(resolve, 1000));

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrentPassword: false,
        showNewPassword: false,
        showConfirmPassword: false
      });

      setSuccessMessage('Contraseña cambiada correctamente.');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setError('Error al cambiar la contraseña. Intenta de nuevo.');
    }
  };

  /**
   * Actualizar configuraciones
   */
  const updateSettings = async (type: 'notifications' | 'privacy', settings: any) => {
    try {
      setError(null);
      
      if (type === 'notifications') {
        setNotifications(settings);
      } else {
        setPrivacy(settings);
      }

      setSuccessMessage('Configuraciones actualizadas.');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Error al actualizar configuraciones:', error);
      setError('Error al actualizar las configuraciones.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">
                Gestiona tu información personal y configuraciones
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Éxito</p>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'profile', name: 'Perfil Personal', icon: User },
                { id: 'stats', name: 'Estadísticas', icon: Trophy },
                { id: 'settings', name: 'Configuraciones', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Perfil Personal */}
            {activeTab === 'profile' && userProfile && (
              <div className="space-y-8">
                {/* Avatar y información básica */}
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                    <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50">
                      <Camera className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {userProfile.firstName} {userProfile.lastName}
                        </h2>
                        <p className="text-gray-600">{userProfile.email}</p>
                        <p className="text-sm text-gray-500">
                          Miembro desde {userProfile.joinedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                          isEditing
                            ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                            : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        {isEditing ? (
                          <>
                            <X className="w-4 h-4" />
                            <span>Cancelar</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-4 h-4" />
                            <span>Editar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Formulario de perfil */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={profileForm.firstName || ''}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName || ''}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email || ''}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth || ''}
                      onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone || ''}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={profileForm.address || ''}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Colegio
                    </label>
                    <input
                      type="text"
                      value={profileForm.school || ''}
                      onChange={(e) => handleProfileChange('school', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grado
                    </label>
                    <select
                      value={profileForm.grade || ''}
                      onChange={(e) => handleProfileChange('grade', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <option value="">Seleccionar grado</option>
                      <option value="1ro Primaria">1ro Primaria</option>
                      <option value="2do Primaria">2do Primaria</option>
                      <option value="3ro Primaria">3ro Primaria</option>
                      <option value="4to Primaria">4to Primaria</option>
                      <option value="5to Primaria">5to Primaria</option>
                      <option value="6to Primaria">6to Primaria</option>
                      <option value="1ro Secundaria">1ro Secundaria</option>
                      <option value="2do Secundaria">2do Secundaria</option>
                      <option value="3ro Secundaria">3ro Secundaria</option>
                      <option value="4to Secundaria">4to Secundaria</option>
                      <option value="5to Secundaria">5to Secundaria</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biografía
                  </label>
                  <textarea
                    value={profileForm.bio || ''}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                    placeholder="Cuéntanos un poco sobre ti..."
                  />
                </div>

                {/* Botones de acción */}
                {isEditing && (
                  <div className="flex space-x-4">
                    <button
                      onClick={saveProfileChanges}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setProfileForm(userProfile);
                      }}
                      className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                )}

                {/* Cambio de contraseña */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Contraseña</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña Actual
                      </label>
                      <div className="relative">
                        <input
                          type={passwordForm.showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({
                            ...prev,
                            currentPassword: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordForm(prev => ({
                            ...prev,
                            showCurrentPassword: !prev.showCurrentPassword
                          }))}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {passwordForm.showCurrentPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={passwordForm.showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({
                            ...prev,
                            newPassword: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordForm(prev => ({
                            ...prev,
                            showNewPassword: !prev.showNewPassword
                          }))}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {passwordForm.showNewPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={passwordForm.showConfirmPassword ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({
                            ...prev,
                            confirmPassword: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordForm(prev => ({
                            ...prev,
                            showConfirmPassword: !prev.showConfirmPassword
                          }))}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {passwordForm.showConfirmPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={changePassword}
                    className="mt-4 flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Cambiar Contraseña</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Estadísticas */}
            {activeTab === 'stats' && userStats && (
              <div className="space-y-8">
                {/* Resumen de estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Actividades Completadas</p>
                        <p className="text-3xl font-bold">{userStats.completedActivities}</p>
                        <p className="text-sm text-blue-100">de {userStats.totalActivities}</p>
                      </div>
                      <Target className="w-8 h-8 text-blue-300" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Promedio de Puntuación</p>
                        <p className="text-3xl font-bold">{userStats.averageScore}%</p>
                        <p className="text-sm text-green-100">calificación media</p>
                      </div>
                      <Star className="w-8 h-8 text-green-300" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Racha Actual</p>
                        <p className="text-3xl font-bold">{userStats.currentStreak}</p>
                        <p className="text-sm text-orange-100">días consecutivos</p>
                      </div>
                      <Flame className="w-8 h-8 text-orange-300" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Tiempo Estudiado</p>
                        <p className="text-3xl font-bold">{Math.floor(userStats.totalTimeStudied / 60)}h</p>
                        <p className="text-sm text-purple-100">{userStats.totalTimeStudied % 60}m total</p>
                      </div>
                      <Calendar className="w-8 h-8 text-purple-300" />
                    </div>
                  </div>
                </div>

                {/* Progreso del nivel */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de Nivel</h3>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{userStats.level}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Nivel {userStats.level}</span>
                        <span className="text-gray-900 font-medium">
                          {userStats.coinsEarned}/500 monedas
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300"
                          style={{ width: `${(userStats.coinsEarned % 500) / 5}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {500 - (userStats.coinsEarned % 500)} monedas para el próximo nivel
                      </p>
                    </div>
                  </div>
                </div>

                {/* Otros logros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Logros Desbloqueados</h4>
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-8 h-8 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{userStats.achievementsUnlocked}</p>
                        <p className="text-sm text-gray-600">logros conseguidos</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Monedas Ganadas</h4>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-bold">₡</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{userStats.coinsEarned}</p>
                        <p className="text-sm text-gray-600">monedas totales</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Configuraciones */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Configuraciones de Notificaciones */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notificaciones
                  </h3>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'emailNotifications', label: 'Notificaciones por Email', description: 'Recibe actualizaciones importantes por correo' },
                      { key: 'pushNotifications', label: 'Notificaciones Push', description: 'Notificaciones del navegador en tiempo real' },
                      { key: 'activityReminders', label: 'Recordatorios de Actividades', description: 'Te recordamos cuando hay nuevas actividades' },
                      { key: 'achievementAlerts', label: 'Alertas de Logros', description: 'Notificaciones cuando desbloquees logros' },
                      { key: 'weeklyReports', label: 'Reportes Semanales', description: 'Resumen semanal de tu progreso' }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                          <p className="text-xs text-gray-500">{setting.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[setting.key as keyof NotificationSettings]}
                            onChange={(e) => updateSettings('notifications', {
                              ...notifications,
                              [setting.key]: e.target.checked
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuraciones de Privacidad */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Privacidad
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Visibilidad del Perfil
                      </label>
                      <select
                        value={privacy.profileVisibility}
                        onChange={(e) => updateSettings('privacy', {
                          ...privacy,
                          profileVisibility: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="public">Público</option>
                        <option value="friends">Solo Amigos</option>
                        <option value="private">Privado</option>
                      </select>
                    </div>

                    {[
                      { key: 'showStats', label: 'Mostrar Estadísticas', description: 'Permite que otros vean tus estadísticas de estudio' },
                      { key: 'showAchievements', label: 'Mostrar Logros', description: 'Muestra tus logros en tu perfil público' },
                      { key: 'allowMessages', label: 'Permitir Mensajes', description: 'Otros usuarios pueden enviarte mensajes' }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                          <p className="text-xs text-gray-500">{setting.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy[setting.key as keyof Omit<PrivacySettings, 'profileVisibility'>]}
                            onChange={(e) => updateSettings('privacy', {
                              ...privacy,
                              [setting.key]: e.target.checked
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zona peligrosa */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Zona Peligrosa
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Eliminar Cuenta</h4>
                      <p className="text-sm text-red-700 mb-3">
                        Esta acción no se puede deshacer. Se eliminarán permanentemente todos tus datos.
                      </p>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar Cuenta</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
