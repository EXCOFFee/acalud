// ============================================================================
// 📊 DASHBOARD DEL ESTUDIANTE - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este es el "panel de control" principal que ve un estudiante cuando entra a la aplicación.
 * Es como la pantalla de inicio de un videojuego, donde puedes ver tu progreso,
 * tus estadísticas, qué actividades has hecho y qué puedes hacer ahora.
 * 
 * 🏗️ ESTRUCTURA DEL DASHBOARD:
 * 1. Saludo personalizado con el nombre del estudiante
 * 2. Tarjetas de progreso (nivel, monedas, actividades completadas, racha)
 * 3. Sección "Mis Aulas" - Las clases donde está inscrito
 * 4. Sección "Actividades Recientes" - Lo que ha hecho últimamente
 * 5. Acciones rápidas - Botones para ir a diferentes secciones
 * 
 * 💡 CONCEPTOS CLAVE:
 * - Gamificación: Usar elementos de juego (niveles, monedas, logros) para motivar
 * - Dashboard: Panel centralizado con información importante
 * - Estado local: Variables que cambian y hacen que la interfaz se actualice
 * - Efectos: Código que se ejecuta cuando algo cambia (como cargar datos)
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useMemo, useState, useEffect } from 'react'; // React y hooks básicos
import { useAuth } from '../../contexts/useAuth'; // Para obtener datos del usuario
import { ClassroomService } from '../../services/implementations/ClassroomService'; // Servicio de aulas
import { ActivityService } from '../../services/implementations/ActivityService'; // Servicio de actividades
import { UserService } from '../../services/implementations/UserService'; // Servicio de usuarios
import { Classroom, ActivityCompletion, UserStats } from '../../types'; // Tipos de datos
import { 
  BookOpen,    // Icono de libro (para aulas)
  Trophy,      // Icono de trofeo (para nivel)
  Coins,       // Icono de monedas (para puntos)
  TrendingUp,  // Icono de tendencia (para progreso)
  Star,        // Icono de estrella (para logros)
  Play,        // Icono de play (para iniciar)
  CheckCircle, // Icono de check (para completado)
  Target,      // Icono de objetivo (para racha)
  Gamepad2     // Icono de gamepad (para juegos)
} from 'lucide-react';

// ============================================================================
// 📋 INTERFACES Y TIPOS
// ============================================================================

/**
 * 🎛️ PROPIEDADES DEL COMPONENTE StudentDashboard
 * 
 * ¿Qué son las Props?
 * Las props (propiedades) son como "parámetros" que se pasan a un componente.
 * Es la forma que tiene un componente padre de comunicarse con un componente hijo.
 * 
 * En este caso, el Dashboard necesita poder navegar a otras páginas,
 * por eso recibe una función 'onNavigate' del componente padre.
 */
type StudentDashboardPage =
  | 'store'
  | 'student-classrooms'
  | 'join-classroom'
  | 'achievements'
  | 'games'
  | 'profile';

type StudentDashboardNavigationPayload = {
  store: undefined;
  'student-classrooms': { classroomId?: string } | undefined;
  'join-classroom': undefined;
  achievements: undefined;
  games: undefined;
  profile: undefined;
};

interface StudentDashboardProps {
  // Función para navegar a otra página de la aplicación
  // Parámetros tipados según el destino
  onNavigate: <Page extends StudentDashboardPage>(page: Page, data?: StudentDashboardNavigationPayload[Page]) => void;
}

// ============================================================================
// 🎨 COMPONENTE PRINCIPAL: StudentDashboard
// ============================================================================

/**
 * 📊 COMPONENTE DASHBOARD DEL ESTUDIANTE
 * 
 * ¿Qué hace este componente?
 * Es la pantalla principal que ve un estudiante al entrar a la aplicación.
 * Muestra su progreso, estadísticas, aulas donde está inscrito y actividades recientes.
 * 
 * ¿Cómo funciona?
 * 1. Recibe una función 'onNavigate' para poder ir a otras páginas
 * 2. Usa el contexto de autenticación para obtener datos del usuario
 * 3. Carga datos desde diferentes servicios (aulas, actividades, estadísticas)
 * 4. Muestra toda la información de forma organizada y atractiva
 * 
 * Conceptos importantes:
 * - React.FC = Functional Component (componente funcional)
 * - Props destructuring = Extraer propiedades directamente ({ onNavigate })
 * - Hooks = Funciones especiales de React que comienzan con 'use'
 */
export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  // ========================================================================
  // 🎣 HOOKS Y ESTADO DEL COMPONENTE
  // ========================================================================
  
  // Hook de autenticación - nos da acceso a los datos del usuario logueado
  const { user } = useAuth();
  
  // 📚 Estado para las aulas donde está inscrito el estudiante
  // useState<Classroom[]> = array vacío inicialmente, contendrá objetos Classroom
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  // 📋 Estado para las actividades completadas recientemente
  // Guarda las últimas actividades que el estudiante ha terminado
  const [recentCompletions, setRecentCompletions] = useState<ActivityCompletion[]>([]);
  
  // 📊 Estado para las estadísticas del usuario (nivel, experiencia, etc.)
  // Puede ser null si no se han cargado aún o no están disponibles
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  
  // ⏳ Estado para controlar si estamos cargando datos
  // Mientras sea true, mostramos un spinner de carga
  const [isLoading, setIsLoading] = useState(true);

  // ========================================================================
  // 🔧 SERVICIOS - INSTANCIAS SINGLETON
  // ========================================================================
  
  // Servicio para manejar aulas (patrón Singleton - una sola instancia)
  const classroomService = useMemo(() => ClassroomService.getInstance(), []);
  
  // Servicio para manejar actividades
  const activityService = useMemo(() => ActivityService.getInstance(), []);
  
  // Servicio para manejar datos de usuarios
  const userService = useMemo(() => UserService.getInstance(), []);

  // ========================================================================
  // 🔄 EFFECT HOOK - CARGA DE DATOS INICIAL
  // ========================================================================
  
  /**
   * 📥 FUNCIÓN PARA CARGAR TODOS LOS DATOS DEL DASHBOARD
   * 
   * ¿Qué hace useEffect?
   * Es como decirle a React: "Cuando algo específico cambie, ejecuta este código"
   * En este caso: "Cuando el usuario cambie, carga todos los datos del dashboard"
   * 
   * ¿Por qué async/await?
   * Porque necesitamos esperar a que el servidor nos responda con los datos.
   * Es como hacer varias llamadas telefónicas y esperar las respuestas.
   * 
   * Pasos que sigue esta función:
   * 1. Verificar que hay un usuario logueado
   * 2. Mostrar indicador de carga
   * 3. Cargar aulas, actividades recientes y estadísticas
   * 4. Ocultar indicador de carga
   */
  useEffect(() => {
    // Función interna asíncrona para cargar datos
    const loadDashboardData = async () => {
      // 🛡️ Verificación de seguridad: si no hay usuario, no hacer nada
      if (!user) return;

      try {
        // 🔄 Activar indicador de carga (spinner)
        setIsLoading(true);
        
        // 📚 PASO 1: Cargar aulas del estudiante
        // Llamamos al servicio para obtener todas las aulas donde está inscrito
        const userClassrooms = await classroomService.getClassroomsByStudent();
        setClassrooms(userClassrooms); // Guardar en el estado

        // 📋 PASO 2: Cargar actividades completadas recientemente
        // Obtenemos todas las actividades que el estudiante ha completado
        const completions = await activityService.getStudentCompletions(user.id);
        
        // Ordenar por fecha (más recientes primero) y tomar solo las 5 últimas
        const sortedCompletions = completions
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          .slice(0, 5); // Tomar solo las primeras 5
        
        setRecentCompletions(sortedCompletions); // Guardar en el estado

        // 📊 PASO 3: Cargar estadísticas del usuario
        try {
          // Intentamos cargar las estadísticas (nivel, experiencia, etc.)
          const stats = await userService.getUserStats(user.id);
          setUserStats(stats); // Guardar en el estado
        } catch (error) {
          // Si no se pueden cargar las estadísticas, no es crítico
          console.warn('Estadísticas no disponibles para este usuario', error);
          // userStats se queda como null, y la interfaz lo maneja correctamente
        }

      } catch (error) {
        // 🚨 Si algo sale mal, registrar el error
        console.error('Error al cargar datos del dashboard:', error);
        // La interfaz mostrará estados por defecto o mensajes de error
      } finally {
        // 🏁 SIEMPRE ejecutar esto, sin importar si fue exitoso o falló
        setIsLoading(false); // Ocultar el indicador de carga
      }
    };

    // 🚀 Ejecutar la función de carga de datos
    loadDashboardData();
  }, [user, activityService, classroomService, userService]); // 👀 Dependencia: actualizar cuando cambian usuario o servicios

  // ========================================================================
  // 🧮 FUNCIONES UTILITARIAS
  // ========================================================================
  
  /**
   * 📈 CALCULAR PROGRESO HACIA EL SIGUIENTE NIVEL
   * 
   * ¿Cómo funciona el sistema de niveles?
   * Como en un videojuego, cada nivel requiere más experiencia que el anterior.
   * Usamos una fórmula matemática: nivel² × 100 = experiencia necesaria
   * 
   * Ejemplo:
   * - Nivel 1: 1² × 100 = 100 exp
   * - Nivel 2: 2² × 100 = 400 exp  
   * - Nivel 3: 3² × 100 = 900 exp
   * 
   * ¿Qué hace esta función?
   * Calcula qué porcentaje de progreso lleva el usuario hacia su próximo nivel.
   * Devuelve un número entre 0 y 100 para mostrar en la barra de progreso.
   */
  const getProgressToNextLevel = () => {
    // 🛡️ Si no hay usuario, devolver 0% de progreso
    if (!user) return 0;
    
    // 📊 Calcular experiencia requerida para el nivel actual
    // Si está en nivel 3, necesitó: (3-1)² × 100 = 400 exp para llegar ahí
    const currentLevelExp = Math.pow(user.level - 1, 2) * 100;
    
    // 📊 Calcular experiencia requerida para el siguiente nivel
    // Para llegar a nivel 4: 4² × 100 = 1600 exp total
    const nextLevelExp = Math.pow(user.level, 2) * 100;
    
    // 📈 Calcular porcentaje de progreso entre niveles
    // (experiencia actual - experiencia nivel actual) / (experiencia siguiente nivel - experiencia nivel actual)
    const progress = ((user.experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
    
    // 🔒 Asegurar que el resultado esté entre 0% y 100%
    // Math.max(progress, 0) = no menos de 0%
    // Math.min(resultado, 100) = no más de 100%
    return Math.min(Math.max(progress, 0), 100);
  };

  // ========================================================================
  // 🎨 RENDERIZADO CONDICIONAL - PANTALLA DE CARGA
  // ========================================================================
  
  /**
   * 🔄 MOSTRAR SPINNER MIENTRAS SE CARGAN LOS DATOS
   * 
   * ¿Qué es renderizado condicional?
   * Es mostrar diferentes cosas dependiendo del estado de la aplicación.
   * Como un semáforo: rojo = parar, verde = continuar, amarillo = esperar.
   * 
   * Si isLoading es true, mostramos un spinner elegante.
   * Si isLoading es false, mostramos el dashboard completo.
   */
  if (isLoading) {
    return (
      // 📱 Contenedor principal - pantalla completa con fondo gris claro
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* 🎯 Centrar el contenido vertical y horizontalmente */}
        <div className="text-center">
          {/* 🌀 Spinner animado - círculo que gira */}
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          {/* 💬 Mensaje amigable para el usuario */}
          <p className="text-gray-600">Cargando tu progreso...</p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // 🎨 RENDERIZADO PRINCIPAL DEL DASHBOARD
  // ========================================================================
  
  /**
   * 🏠 ESTRUCTURA PRINCIPAL DEL DASHBOARD
   * 
   * Layout responsive que se adapta a diferentes tamaños de pantalla:
   * - Mobile: columna única
   * - Tablet: 2 columnas 
   * - Desktop: hasta 4 columnas
   */
  return (
    // 📱 Contenedor principal - pantalla completa con fondo gris suave
    <div className="min-h-screen bg-gray-50">
      {/* 🎯 Contenedor centrado con máximo ancho y padding responsivo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================
        // 👋 SECCIÓN: ENCABEZADO DE BIENVENIDA
        // ======================================================================== */}
        <div className="mb-8">
          {/* 🎊 Saludo personalizado con el nombre del estudiante */}
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Hola, {user?.name}!
          </h1>
          {/* 💭 Mensaje motivacional */}
          <p className="text-gray-600 mt-2">
            Continúa aprendiendo y divirtiéndote con nuestras actividades
          </p>
        </div>

        {/* ========================================================================
        // 📊 SECCIÓN: TARJETAS DE PROGRESO Y ESTADÍSTICAS
        // ======================================================================== */}
        
        {/* 🎮 Grid responsivo de tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* 🏆 TARJETA 1: NIVEL ACTUAL DEL ESTUDIANTE */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            {/* 📊 Fila superior: Información principal + Icono */}
            <div className="flex items-center justify-between">
              <div>
                {/* 📝 Etiqueta descriptiva */}
                <p className="text-purple-100 text-sm font-medium">Nivel Actual</p>
                {/* 🔢 Número del nivel en grande */}
                <p className="text-3xl font-bold">{user?.level}</p>
              </div>
              {/* 🎯 Icono decorativo en un círculo */}
              <div className="p-3 bg-purple-400 bg-opacity-30 rounded-lg">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            
            {/* 📈 Barra de progreso hacia el siguiente nivel */}
            <div className="mt-4">
              {/* 📊 Fila con texto y porcentaje */}
              <div className="flex justify-between text-sm text-purple-100 mb-1">
                <span>Progreso</span>
                <span>{Math.round(getProgressToNextLevel())}%</span>
              </div>
              {/* 🔳 Contenedor de la barra de progreso */}
              <div className="w-full bg-purple-400 bg-opacity-30 rounded-full h-2">
                {/* 📊 Barra de progreso que se llena según el porcentaje */}
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${getProgressToNextLevel()}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 🪙 TARJETA 2: MONEDAS DEL ESTUDIANTE */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            {/* 📊 Fila superior: Información + Icono */}
            <div className="flex items-center justify-between">
              <div>
                {/* 📝 Etiqueta de monedas */}
                <p className="text-yellow-100 text-sm font-medium">Monedas</p>
                {/* 💰 Cantidad de monedas en número grande */}
                <p className="text-3xl font-bold">{user?.coins}</p>
              </div>
              {/* 🎯 Icono de monedas */}
              <div className="p-3 bg-yellow-400 bg-opacity-30 rounded-lg">
                <Coins className="w-6 h-6" />
              </div>
            </div>
            {/* 🛒 Botón para ir a la tienda */}
            <button
              onClick={() => onNavigate('store')} // Navegar a la página de la tienda
              className="mt-4 text-sm text-yellow-100 hover:text-white transition-colors"
            >
              Ir a la tienda →
            </button>
          </div>

          {/* ✅ TARJETA 3: ACTIVIDADES COMPLETADAS */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            {/* 📊 Fila superior: Información + Icono */}
            <div className="flex items-center justify-between">
              <div>
                {/* 📝 Etiqueta de actividades completadas */}
                <p className="text-green-100 text-sm font-medium">Completadas</p>
                {/* 🔢 Número total de actividades completadas */}
                {/* Si userStats es null, mostrar 0 como valor por defecto */}
                <p className="text-3xl font-bold">{userStats?.totalActivitiesCompleted || 0}</p>
              </div>
              {/* 🎯 Icono de check (completado) */}
              <div className="p-3 bg-green-400 bg-opacity-30 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            {/* 📊 Información adicional: promedio de puntuación */}
            <p className="mt-4 text-sm text-green-100">
              Promedio: {userStats?.averageScore || 0}%
            </p>
          </div>

          {/* 🎯 TARJETA 4: RACHA DE DÍAS CONSECUTIVOS */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            {/* 📊 Fila superior: Información + Icono */}
            <div className="flex items-center justify-between">
              <div>
                {/* 📝 Etiqueta de racha */}
                <p className="text-blue-100 text-sm font-medium">Racha</p>
                {/* 🔥 Número de días consecutivos estudiando */}
                <p className="text-3xl font-bold">{userStats?.streakDays || 0}</p>
              </div>
              {/* 🎯 Icono de objetivo/target */}
              <div className="p-3 bg-blue-400 bg-opacity-30 rounded-lg">
                <Target className="w-6 h-6" />
              </div>
            </div>
            {/* 📅 Texto explicativo */}
            <p className="mt-4 text-sm text-blue-100">
              días consecutivos
            </p>
          </div>
        </div>

        {/* ========================================================================
        // 📚 SECCIÓN: CONTENIDO PRINCIPAL (MIS AULAS + ACTIVIDADES RECIENTES)
        // ======================================================================== */}
        
        {/* 🏗️ Grid de 2 columnas en pantallas grandes, 1 columna en móviles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 📚 SECCIÓN IZQUIERDA: MIS AULAS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* 📋 Encabezado de la sección con botones de acción */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Mis Aulas</h2>
              {/* 🔗 Botones de acceso rápido */}
              <div className="flex items-center space-x-2">
                {/* 🏫 Botón: Ir a Mis Aulas (página completa) */}
                <button
                  onClick={() => onNavigate('student-classrooms')}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1.5"
                  title="Ver todas mis aulas"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Mis Aulas</span>
                </button>
                {/* 📋 Botón: Ver todas (solo si hay aulas) */}
                {classrooms.length > 0 && (
                  <button
                    onClick={() => onNavigate('student-classrooms')}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1"
                    title="Ver listado completo"
                  >
                    <span>Ver todas</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* 📝 Contenido de la sección */}
            <div className="p-6">
              {/* 🔍 RENDERIZADO CONDICIONAL: ¿Tiene aulas o no? */}
              {classrooms.length === 0 ? (
                /* 😔 CASO 1: No tiene aulas - Mostrar mensaje de estado vacío */
                <div className="text-center py-8">
                  {/* 📖 Icono grande de libro */}
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {/* 💬 Mensaje explicativo */}
                  <p className="text-gray-600 mb-4">No estás inscrito en ninguna aula aún</p>
                  {/* 🔗 Botón de acción para unirse a un aula */}
                  <button
                    onClick={() => onNavigate('join-classroom')} // Navegar a página de unirse
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Únete a un aula
                  </button>
                </div>
              ) : (
                /* 😊 CASO 2: Sí tiene aulas - Mostrar lista de aulas */
                <div className="space-y-4">
                  {/* 📋 Lista de aulas (máximo 3 en el dashboard) */}
                  {classrooms.slice(0, 3).map((classroom) => (
                    /* 🏫 Tarjeta individual de aula */
                    <div
                      key={classroom.id} // Clave única para React
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => onNavigate('student-classrooms', { classroomId: classroom.id })} // Navegar a actividades del aula
                    >
                      {/* 👈 Lado izquierdo: información del aula */}
                      <div className="flex items-center space-x-3">
                        {/* 📖 Icono del aula */}
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        {/* 📝 Información del aula */}
                        <div>
                          {/* 🏷️ Nombre del aula */}
                          <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                          {/* 📚 Materia y profesor */}
                          <p className="text-sm text-gray-600">
                            {classroom.subject} • {classroom.teacher.name}
                          </p>
                        </div>
                      </div>
                      {/* 👉 Lado derecho: icono de "ir" */}
                      <Play className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                  
                  {/* 🔍 Si hay más de 3 aulas, mostrar botón para ver todas */}
                  {classrooms.length > 3 && (
                    <button
                      onClick={() => onNavigate('student-classrooms')} // Navegar a página completa de aulas
                      className="w-full text-center py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Ver todas las aulas ({classrooms.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 📊 SECCIÓN DERECHA: ACTIVIDADES RECIENTES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* 📋 Encabezado de la sección con botones de acción */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Actividades Recientes</h2>
              {/* 🔗 Botones de acceso rápido */}
              <div className="flex items-center space-x-2">
                {/* 🏆 Botón: Ir a Logros (página completa) */}
                <button
                  onClick={() => onNavigate('achievements')}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1.5"
                  title="Ver logros y historial"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Logros</span>
                </button>
                {/* 📋 Botón: Ver historial (solo si hay actividades) */}
                {recentCompletions.length > 0 && (
                  <button
                    onClick={() => onNavigate('achievements')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
                    title="Ver historial completo"
                  >
                    <span>Ver historial</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* 📝 Contenido de la sección */}
            <div className="p-6">
              {/* 🔍 RENDERIZADO CONDICIONAL: ¿Ha completado actividades? */}
              {recentCompletions.length === 0 ? (
                /* 😔 CASO 1: No ha completado actividades - Estado vacío */
                <div className="text-center py-8">
                  {/* ⭐ Icono grande de estrella */}
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {/* 💬 Mensaje explicativo */}
                  <p className="text-gray-600 mb-4">No has completado actividades aún</p>
                  {/* 🔗 Botón de acción para explorar actividades */}
                  <button
                    onClick={() => onNavigate('student-classrooms')} // Navegar a aulas para buscar actividades
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Explorar actividades
                  </button>
                </div>
              ) : (
                /* 😊 CASO 2: Sí ha completado actividades - Mostrar lista */
                <div className="space-y-4">
                  {/* 📋 Lista de actividades completadas recientemente */}
                  {recentCompletions.map((completion) => (
                    /* 🎯 Tarjeta individual de actividad completada */
                    <div
                      key={completion.id} // Clave única para React
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      {/* 👈 Lado izquierdo: información de la actividad */}
                      <div className="flex items-center space-x-3">
                        {/* 🎨 Icono con color basado en el rendimiento */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          // 📊 Lógica de colores según puntuación:
                          completion.score >= completion.maxScore * 0.9 ? 'bg-green-100' :    // Verde: 90%+
                          completion.score >= completion.maxScore * 0.7 ? 'bg-yellow-100' :   // Amarillo: 70-89%
                          'bg-red-100'                                                          // Rojo: <70%
                        }`}>
                          {/* ⭐ Estrella con color matching */}
                          <Star className={`w-5 h-5 ${
                            completion.score >= completion.maxScore * 0.9 ? 'text-green-600' :
                            completion.score >= completion.maxScore * 0.7 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`} />
                        </div>
                        {/* 📝 Información de la actividad */}
                        <div>
                          {/* 🏷️ Título genérico */}
                          <h3 className="font-semibold text-gray-900">Actividad Completada</h3>
                          {/* 📊 Porcentaje obtenido y fecha de completación */}
                          <p className="text-sm text-gray-600">
                            {Math.round((completion.score / completion.maxScore) * 100)}% • {
                              new Date(completion.completedAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </div>
                      {/* 👉 Lado derecho: puntuación detallada */}
                      <div className="text-right">
                        {/* 🔢 Puntos obtenidos / puntos máximos */}
                        <p className="text-sm font-semibold text-gray-900">
                          {completion.score}/{completion.maxScore}
                        </p>
                        {/* 📝 Etiqueta "puntos" */}
                        <p className="text-xs text-gray-500">puntos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================
        // 🚀 SECCIÓN: ACCIONES RÁPIDAS
        // ======================================================================== */}
        
        {/* 🎯 Panel de acciones que el estudiante puede realizar */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 📋 Título motivacional */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">¿Qué quieres hacer hoy?</h2>
          
          {/* 🏗️ Grid de botones de acción (responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 🎮 BOTÓN: JUEGOS EDUCATIVOS (Para todos los usuarios) */}
            <button
              onClick={() => onNavigate('games')}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gamepad2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Juegos</h3>
                <p className="text-sm text-purple-700">Jugar y aprender</p>
              </div>
            </button>

            {/* 📚 BOTÓN 1: ESTUDIAR / HACER ACTIVIDADES */}
            <button
              onClick={() => onNavigate('student-classrooms')} // Navegar a aulas para estudiar
              className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              {/* 📖 Icono de libro */}
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-indigo-900">Estudiar</h3>
                <p className="text-sm text-indigo-700">Hacer actividades</p>
              </div>
            </button>

            {/* 🏆 BOTÓN 2: LOGROS Y PROGRESO */}
            <button
              onClick={() => onNavigate('achievements')} // Navegar a página de logros
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              {/* 🏆 Icono de trofeo */}
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-purple-900">Logros</h3>
                <p className="text-sm text-purple-700">Ver progreso</p>
              </div>
            </button>

            {/* 🛒 BOTÓN 3: TIENDA DE RECOMPENSAS */}
            <button
              onClick={() => onNavigate('store')} // Navegar a la tienda
              className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-left"
            >
              {/* 🪙 Icono de monedas */}
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Coins className="w-5 h-5 text-yellow-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-yellow-900">Tienda</h3>
                <p className="text-sm text-yellow-700">Gastar monedas</p>
              </div>
            </button>

            {/* 👤 BOTÓN 4: PERFIL Y ESTADÍSTICAS */}
            <button
              onClick={() => onNavigate('profile')} // Navegar al perfil
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              {/* 📈 Icono de tendencia/gráfico */}
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-green-900">Perfil</h3>
                <p className="text-sm text-green-700">Ver estadísticas</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};