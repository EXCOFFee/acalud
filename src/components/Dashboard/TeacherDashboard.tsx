// ============================================================================
// 👨‍🏫 DASHBOARD DEL DOCENTE - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este es el "centro de mando" para profesores. Es como el cockpit de un avión,
 * donde el piloto (profesor) puede ver todas las métricas importantes de sus vuelos (clases):
 * - Cuántas aulas tiene activas
 * - Cuántos estudiantes enseña en total
 * - Qué actividades ha creado recientemente
 * - Estadísticas de rendimiento de sus estudiantes
 * 
 * 🎓 DIFERENCIAS CON EL DASHBOARD DE ESTUDIANTE:
 * - Estudiante: Ve SU progreso personal (nivel, monedas, actividades completadas)
 * - Profesor: Ve el progreso de TODOS sus estudiantes (estadísticas agregadas)
 * - Estudiante: Consume contenido (hace actividades)
 * - Profesor: Crea contenido (diseña actividades y gestiona aulas)
 * 
 * 🏗️ ARQUITECTURA DEL COMPONENTE:
 * 1. Tarjetas de estadísticas generales (resumen ejecutivo)
 * 2. Sección "Mis Aulas" (gestión de clases)
 * 3. Sección "Actividades Recientes" (contenido creado)
 * 4. Acciones rápidas (botones para crear contenido nuevo)
 * 
 * 💡 CONCEPTOS CLAVE:
 * - Dashboard administrativo vs. dashboard de usuario final
 * - Estadísticas agregadas (suma de datos de múltiples fuentes)
 * - CRUD operations (Create, Read, Update, Delete)
 * - Estados de gestión de contenido
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useMemo, useState, useEffect } from 'react'; // React y hooks básicos
import { useAuth } from '../../contexts/useAuth'; // Para obtener datos del profesor logueado
import { ClassroomService } from '../../services/implementations/ClassroomService'; // Servicio de aulas
import { ActivityService } from '../../services/implementations/ActivityService'; // Servicio de actividades
import { Classroom, Activity } from '../../types'; // Tipos de datos
import { 
  Users,      // Icono de usuarios (para estudiantes/aulas)
  BookOpen,   // Icono de libro (para actividades/materias)
  Plus,       // Icono de más (para crear nuevo contenido)
  TrendingUp, // Icono de tendencia (para estadísticas)
  Award,      // Icono de premio (para logros/actividades especiales)
  Eye,        // Icono de ojo (para ver detalles)
  Edit,       // Icono de editar (para modificar contenido)
  Trash2,     // Icono de basura (para eliminar contenido)
  Gamepad2    // Icono de gamepad (para juegos)
} from 'lucide-react';

// ============================================================================
// 📋 INTERFACES Y TIPOS
// ============================================================================

/**
 * 🎛️ PROPIEDADES DEL COMPONENTE TeacherDashboard
 * 
 * ¿En qué se diferencia de StudentDashboard?
 * En esencia son iguales - ambos necesitan navegar a otras páginas.
 * La diferencia está en QUÉ páginas visitan:
 * - Estudiante: 'student-classrooms', 'achievements', 'store'
 * - Profesor: 'create-classroom', 'create-activity', 'repository'
 * 
 * Es como tener el mismo control remoto, pero para diferentes dispositivos.
 */
type TeacherDashboardPage =
  | 'create-classroom'
  | 'create-activity'
  | 'create-game'
  | 'classrooms'
  | 'classroom-detail'
  | 'repository';

type TeacherDashboardNavigationPayload = {
  'create-classroom': undefined;
  'create-activity': undefined;
  'create-game': undefined;
  classrooms: undefined;
  'classroom-detail': { classroomId: string };
  repository: undefined;
};

interface TeacherDashboardProps {
  // Función para navegar a otras páginas de la aplicación
  // El profesor puede ir a: crear aula, crear actividad, ver repositorio, etc.
  onNavigate: <Page extends TeacherDashboardPage>(page: Page, data?: TeacherDashboardNavigationPayload[Page]) => void;
}

// ============================================================================
// 🎨 COMPONENTE PRINCIPAL: TeacherDashboard
// ============================================================================

/**
 * 👨‍🏫 COMPONENTE DASHBOARD DEL PROFESOR
 * 
 * ¿Qué responsabilidades tiene un profesor en la aplicación?
 * 1. 👥 GESTOR DE AULAS: Crear y administrar clases
 * 2. 🎯 CREADOR DE CONTENIDO: Diseñar actividades educativas
 * 3. 📊 ANALISTA DE DATOS: Monitorear el progreso de estudiantes
 * 4. 🎮 GAMIFICADOR: Usar elementos de juego para motivar
 * 
 * ¿Cómo difiere del dashboard de estudiante?
 * - Estudiante: CONSUME contenido (hace actividades, gana puntos)
 * - Profesor: PRODUCE contenido (crea actividades, gestiona estudiantes)
 * - Estudiante: Ve métricas personales (mi nivel, mis monedas)
 * - Profesor: Ve métricas agregadas (todos mis estudiantes, todas mis aulas)
 */
export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  // ========================================================================
  // 🎣 HOOKS Y ESTADO DEL COMPONENTE
  // ========================================================================
  
  // Hook de autenticación - datos del profesor logueado
  const { user } = useAuth();
  
  // 📚 Estado para las aulas que maneja el profesor
  // Un profesor puede tener múltiples aulas (ej: "Matemáticas 5A", "Matemáticas 5B")
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  // 🎯 Estado para las actividades creadas recientemente
  // Lista de las últimas actividades que el profesor ha diseñado
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  
  // ⏳ Estado de carga - mientras obtenemos datos del servidor
  const [isLoading, setIsLoading] = useState(true);
  
  // 📊 Estado para estadísticas agregadas del profesor
  // Resumen numérico de toda su actividad docente
  const [stats, setStats] = useState({
    totalClassrooms: 0,     // Número total de aulas que maneja
    totalStudents: 0,       // Suma de estudiantes en todas sus aulas
    totalActivities: 0,     // Número total de actividades creadas
    averageCompletion: 0    // Promedio de completación de sus actividades
  });

  // ========================================================================
  // 🔧 SERVICIOS - INSTANCIAS SINGLETON
  // ========================================================================
  
  // Servicio para gestionar aulas (patrón Singleton)
  const classroomService = useMemo(() => ClassroomService.getInstance(), []);
  
  // Servicio para gestionar actividades
  const activityService = useMemo(() => ActivityService.getInstance(), []);

  // ========================================================================
  // 🔄 EFFECT HOOK - CARGA DE DATOS INICIAL
  // ========================================================================
  
  /**
   * 📥 FUNCIÓN PARA CARGAR TODOS LOS DATOS DEL PROFESOR
   * 
   * ¿Qué datos necesita ver un profesor en su dashboard?
   * 1. 📚 SUS AULAS: Clases que maneja con número de estudiantes
   * 2. 🎯 SUS ACTIVIDADES: Contenido que ha creado recientemente
   * 3. 📊 SUS ESTADÍSTICAS: Resumen numérico de su actividad docente
   * 
   * ¿Por qué es más complejo que el dashboard de estudiante?
   * Porque el profesor maneja MÚLTIPLES entidades:
   * - 1 profesor -> N aulas -> N estudiantes -> N actividades
   * Es como un árbol de datos que debemos recorrer y agregar.
   * 
   * Proceso paso a paso:
   * 1. Obtener todas las aulas del profesor
   * 2. Para cada aula, obtener sus actividades
   * 3. Combinar todas las actividades en una lista
   * 4. Calcular estadísticas agregadas
   */
  useEffect(() => {
    // Función interna asíncrona para cargar datos
    const loadDashboardData = async () => {
      // 🛡️ Verificación de seguridad: si no hay usuario, no hacer nada
      if (!user) return;

      try {
        // 🔄 Activar indicador de carga
        setIsLoading(true);
        
        // 📚 PASO 1: Cargar todas las aulas del profesor
        // Un profesor puede tener múltiples aulas (ej: Matemáticas A, Matemáticas B)
        const userClassrooms = await classroomService.getClassroomsByTeacher();
        setClassrooms(userClassrooms); // Guardar en el estado

        // 🎯 PASO 2: Cargar actividades de todas las aulas
        // Necesitamos recopilar actividades de TODAS las aulas del profesor
        const allActivities: Activity[] = []; // Array para acumular todas las actividades
        
        // 🔄 Iterar por cada aula del profesor
        for (const classroom of userClassrooms) {
          // Obtener actividades de esta aula específica
          const activities = await activityService.getActivitiesByClassroom(classroom.id);
          // Agregar las actividades al array acumulador
          allActivities.push(...activities); // Spread operator para "aplanar" arrays
        }
        
        // 📅 Ordenar actividades por fecha (más recientes primero) y tomar solo 5
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5); // Solo las 5 más recientes para el dashboard
        
        setRecentActivities(sortedActivities); // Guardar en el estado

        // 📊 PASO 3: Calcular estadísticas agregadas
        // Sumar estudiantes de todas las aulas usando reduce()
        const totalStudents = userClassrooms.reduce((sum, classroom) => sum + classroom.students.length, 0);
        const totalActivities = allActivities.length;
        
        // 💾 Guardar estadísticas en el estado
        setStats({
          totalClassrooms: userClassrooms.length,  // Cantidad de aulas
          totalStudents,                           // Suma de estudiantes
          totalActivities,                         // Cantidad de actividades
          averageCompletion: totalActivities > 0 ? 78 : 0 // Valor simulado (en una app real, se calcularía)
        });

      } catch (error) {
        // 🚨 Si algo sale mal, registrar el error
        console.error('Error al cargar datos del dashboard:', error);
        // El dashboard mostrará valores por defecto (0s) o estados de error
      } finally {
        // 🏁 SIEMPRE ejecutar esto, sin importar si fue exitoso o falló
        setIsLoading(false); // Ocultar el indicador de carga
      }
    };

    // 🚀 Ejecutar la función de carga de datos
    loadDashboardData();
  }, [activityService, classroomService, user]); // 👀 Dependencia: solo ejecutar cuando cambian usuario o servicios

  // ========================================================================
  // 🎬 FUNCIONES DE MANEJO DE EVENTOS
  // ========================================================================
  
  /**
   * 🏫 CREAR NUEVA AULA
   * 
   * ¿Qué es crear un aula?
   * Es como abrir una nueva clase en un colegio:
   * 1. Dar nombre al aula (ej: "Matemáticas 5A")
   * 2. Definir la materia
   * 3. Generar código de acceso para estudiantes
   * 4. Configurar parámetros básicos
   * 
   * Esta función solo navega a la página de creación.
   * La lógica real de creación está en el componente CreateClassroomForm.
   */
  const handleCreateClassroom = () => {
    onNavigate('create-classroom'); // Navegar a página de creación de aula
  };

  /**
   * 🎯 CREAR NUEVA ACTIVIDAD
   * 
   * ¿Qué es crear una actividad?
   * Es diseñar contenido educativo interactivo:
   * - Trivias (preguntas de selección múltiple)
   * - Juegos de memoria (matching games)
   * - Crucigramas (word puzzles)
   * - Actividades interactivas (drag & drop)
   * 
   * El profesor define:
   * - Título y descripción
   * - Nivel de dificultad
   * - Preguntas/contenido
   * - Puntuación y recompensas
   */
  const handleCreateActivity = () => {
    onNavigate('create-activity'); // Navegar a página de creación de actividad
  };

  /**
   * 🎮 CREAR NUEVO JUEGO
   * 
   * ¿Qué es crear un juego?
   * Es diseñar experiencias educativas gamificadas:
   * - Trivias interactivas con puntuación
   * - Crucigramas educativos
   * - Simulaciones inmersivas
   * 
   * El profesor configura:
   * - Tipo de juego (trivia, crossword, simulation)
   * - Materia y nivel educativo
   * - Preguntas con puntuación
   * - Duración y dificultad
   */
  const handleCreateGame = () => {
    onNavigate('create-game'); // Navegar a página de creación de juegos
  };

  // ========================================================================
  // 🎨 RENDERIZADO CONDICIONAL - PANTALLA DE CARGA
  // ========================================================================
  
  /**
   * 🔄 MOSTRAR SPINNER MIENTRAS SE CARGAN LOS DATOS
   * 
   * ¿Por qué es importante mostrar estados de carga?
   * Porque el dashboard del profesor carga MÁS datos que el del estudiante:
   * - Estudiante: Sus propios datos (rápido)
   * - Profesor: Datos de múltiples aulas + estudiantes + actividades (más lento)
   * 
   * La experiencia del usuario mejora cuando sabe que algo está pasando,
   * en lugar de ver una pantalla en blanco que parece "rota".
   */
  if (isLoading) {
    return (
      // 📱 Contenedor principal - pantalla completa con fondo gris suave
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* 🎯 Centrar el contenido vertical y horizontalmente */}
        <div className="text-center">
          {/* 🌀 Spinner animado - círculo que gira */}
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          {/* 💬 Mensaje específico para profesores */}
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // 🎨 RENDERIZADO PRINCIPAL DEL DASHBOARD
  // ========================================================================
  
  /**
   * 🏠 ESTRUCTURA PRINCIPAL DEL DASHBOARD DE PROFESOR
   * 
   * Layout específicamente diseñado para necesidades docentes:
   * - Vista ejecutiva con métricas clave
   * - Acceso rápido a herramientas de creación
   * - Monitoreo de actividad estudiantil
   * - Gestión centralizada de contenido
   */
  return (
    // 📱 Contenedor principal - pantalla completa con fondo gris suave
    <div className="min-h-screen bg-gray-50">
      {/* 🎯 Contenedor centrado con máximo ancho y padding responsivo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================
        // 👋 SECCIÓN: ENCABEZADO DE BIENVENIDA PARA PROFESORES
        // ======================================================================== */}
        <div className="mb-8">
          {/* 🎊 Saludo personalizado con el nombre del profesor */}
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Bienvenido, {user?.name}!
          </h1>
          {/* 💭 Mensaje orientado a funciones docentes */}
          <p className="text-gray-600 mt-2">
            Aquí tienes un resumen de tus aulas y actividades
          </p>
        </div>

        {/* ========================================================================
        // 📊 SECCIÓN: TARJETAS DE ESTADÍSTICAS PARA PROFESORES
        // ======================================================================== */}
        
        {/* 🎮 Grid responsivo de métricas docentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* 🏫 TARJETA 1: AULAS ACTIVAS QUE MANEJA */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            {/* 📊 Layout horizontal: Icono + Información */}
            <div className="flex items-center">
              {/* 🎯 Icono de usuarios en contenedor azul */}
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              {/* 📝 Información numérica */}
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aulas Activas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClassrooms}</p>
              </div>
            </div>
          </div>

          {/* 👥 TARJETA 2: TOTAL DE ESTUDIANTES */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            {/* 📊 Layout horizontal: Icono + Información */}
            <div className="flex items-center">
              {/* 🎯 Icono de usuarios en contenedor verde */}
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              {/* 📝 Suma de estudiantes de todas las aulas */}
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Estudiantes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>

          {/* 🎯 TARJETA 3: ACTIVIDADES CREADAS */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            {/* 📊 Layout horizontal: Icono + Información */}
            <div className="flex items-center">
              {/* 📖 Icono de libro en contenedor morado */}
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              {/* 📝 Número total de actividades diseñadas */}
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Actividades</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
              </div>
            </div>
          </div>

          {/* 📈 TARJETA 4: PORCENTAJE DE COMPLETACIÓN */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            {/* 📊 Layout horizontal: Icono + Información */}
            <div className="flex items-center">
              {/* 📈 Icono de tendencia en contenedor amarillo */}
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              {/* 📊 Promedio de actividades completadas por estudiantes */}
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completación</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageCompletion}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================
        // 🏫 SECCIÓN: CONTENIDO PRINCIPAL PARA PROFESORES
        // ======================================================================== */}
        
        {/* 🏗️ Grid de 2 columnas en pantallas grandes, 1 columna en móviles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 🏫 SECCIÓN IZQUIERDA: GESTIÓN DE AULAS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* 📋 Encabezado con título y botones de acción */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                {/* 🏷️ Título de la sección */}
                <h2 className="text-xl font-bold text-gray-900">Mis Aulas</h2>
                {/* 🔗 Botones de acceso rápido */}
                <div className="flex items-center space-x-2">
                  {/* 🏫 Botón: Ir a Gestión de Aulas */}
                  <button
                    onClick={() => onNavigate('classrooms')}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1.5"
                    title="Ver todas mis aulas"
                  >
                    <Users className="w-4 h-4" />
                    <span>Aulas</span>
                  </button>
                  {/* ➕ Botón: Crear nueva aula */}
                  <button
                    onClick={handleCreateClassroom}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    title="Crear nueva aula"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Aula</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* 📝 Contenido de la sección de aulas */}
            <div className="p-6">
              {/* 🔍 RENDERIZADO CONDICIONAL: ¿Tiene aulas creadas? */}
              {classrooms.length === 0 ? (
                /* 😔 CASO 1: No tiene aulas - Estado vacío con onboarding */
                <div className="text-center py-8">
                  {/* 👥 Icono grande de usuarios */}
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {/* 💬 Mensaje explicativo para nuevos profesores */}
                  <p className="text-gray-600 mb-4">No tienes aulas creadas aún</p>
                  {/* 🔗 Botón de acción para crear primera aula */}
                  <button
                    onClick={handleCreateClassroom} // Navegar a creación de aula
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Crear tu primera aula
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
                      onClick={() => onNavigate('classroom-detail', { classroomId: classroom.id })} // Navegar a detalle del aula
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
                          {/* 📊 Estadísticas: número de estudiantes y materia */}
                          <p className="text-sm text-gray-600">
                            {classroom.students.length} estudiantes • {classroom.subject}
                          </p>
                        </div>
                      </div>
                      {/* 👉 Lado derecho: icono de "ver detalles" */}
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                  
                  {/* 🔍 Si hay más de 3 aulas, mostrar botón para ver todas */}
                  {classrooms.length > 3 && (
                    <button
                      onClick={() => onNavigate('classrooms')} // Navegar a página completa de aulas
                      className="w-full text-center py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Ver todas las aulas ({classrooms.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 🎯 SECCIÓN DERECHA: GESTIÓN DE ACTIVIDADES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* 📋 Encabezado con título y botones de acción */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                {/* 🏷️ Título de la sección */}
                <h2 className="text-xl font-bold text-gray-900">Actividades Recientes</h2>
                {/* 🔗 Botones de acceso rápido */}
                <div className="flex items-center space-x-2">
                  {/* 📚 Botón: Ir a Repositorio de Actividades */}
                  <button
                    onClick={() => onNavigate('repository')}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-1.5"
                    title="Ver todas mis actividades"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Repositorio</span>
                  </button>
                  {/* ➕ Botón: Crear nueva actividad */}
                  <button
                    onClick={handleCreateActivity}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    title="Crear nueva actividad"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Actividad</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* 📝 Contenido de la sección de actividades */}
            <div className="p-6">
              {/* 🔍 RENDERIZADO CONDICIONAL: ¿Ha creado actividades? */}
              {recentActivities.length === 0 ? (
                /* 😔 CASO 1: No ha creado actividades - Estado vacío con onboarding */
                <div className="text-center py-8">
                  {/* 📖 Icono grande de libro */}
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {/* 💬 Mensaje explicativo para nuevos profesores */}
                  <p className="text-gray-600 mb-4">No tienes actividades creadas aún</p>
                  {/* 🔗 Botón de acción para crear primera actividad */}
                  <button
                    onClick={handleCreateActivity} // Navegar a creación de actividad
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Crear tu primera actividad
                  </button>
                </div>
              ) : (
                /* 😊 CASO 2: Sí ha creado actividades - Mostrar lista */
                <div className="space-y-4">
                  {/* 📋 Lista de actividades creadas recientemente */}
                  {recentActivities.map((activity) => (
                    /* 🎯 Tarjeta individual de actividad */
                    <div
                      key={activity.id} // Clave única para React
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {/* 👈 Lado izquierdo: información de la actividad */}
                      <div className="flex items-center space-x-3">
                        {/* 🎨 Icono con color basado en el tipo de actividad */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          // 🎮 Lógica de colores según tipo:
                          activity.type === 'game' ? 'bg-green-100' :        // Verde: juegos
                          activity.type === 'memory' ? 'bg-purple-100' :     // Morado: memoria
                          'bg-blue-100'                                       // Azul: otros tipos
                        }`}>
                          {/* 🏆 Icono de premio para todas las actividades */}
                          <Award className={`w-5 h-5 ${
                            activity.type === 'game' ? 'text-green-600' :
                            activity.type === 'memory' ? 'text-purple-600' : 'text-blue-600'
                          }`} />
                        </div>
                        {/* 📝 Información de la actividad */}
                        <div>
                          {/* 🏷️ Título de la actividad */}
                          <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                          {/* 📚 Materia y nivel de dificultad */}
                          <p className="text-sm text-gray-600">
                            {activity.subject} • {activity.difficulty}
                          </p>
                        </div>
                      </div>
                      {/* 👉 Lado derecho: botones de acción (editar/eliminar) */}
                      <div className="flex items-center space-x-2">
                        {/* ✏️ Botón para editar actividad */}
                        <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* 🗑️ Botón para eliminar actividad */}
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* 🔍 Botón para ver todas las actividades en el repositorio */}
                  <button
                    onClick={() => onNavigate('repository')} // Navegar al repositorio completo
                    className="w-full text-center py-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Ver todas las actividades
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================
        // 🚀 SECCIÓN: ACCIONES RÁPIDAS PARA PROFESORES
        // ======================================================================== */}
        
        {/* 🎯 Panel de acciones principales que puede realizar un profesor */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 📋 Título orientado a productividad docente */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
          
          {/* 🏗️ Grid de botones de acción (4 columnas en desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 🏫 BOTÓN 1: CREAR NUEVA AULA */}
            <button
              onClick={handleCreateClassroom} // Navegar a creación de aula
              className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left"
            >
              {/* 👥 Icono de usuarios */}
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-indigo-900">Crear Aula</h3>
                <p className="text-sm text-indigo-700">Organiza a tus estudiantes</p>
              </div>
            </button>

            {/* 🎯 BOTÓN 2: CREAR NUEVA ACTIVIDAD */}
            <button
              onClick={handleCreateActivity} // Navegar a creación de actividad
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              {/* 📖 Icono de libro */}
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-purple-900">Crear Actividad</h3>
                <p className="text-sm text-purple-700">Diseña contenido lúdico</p>
              </div>
            </button>

            {/* 🎮 BOTÓN 3: CREAR NUEVO JUEGO */}
            <button
              onClick={handleCreateGame} // Navegar a creación de juegos
              className="flex items-center space-x-3 p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors text-left"
            >
              {/* 🎮 Icono de gamepad */}
              <div className="p-2 bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 rounded-lg">
                <Gamepad2 className="w-5 h-5 text-pink-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-pink-900">Crear Juego</h3>
                <p className="text-sm text-pink-700">Diseña juegos educativos</p>
              </div>
            </button>

            {/* 🏆 BOTÓN 4: EXPLORAR REPOSITORIO */}
            <button
              onClick={() => onNavigate('repository')} // Navegar al repositorio
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              {/* 🏆 Icono de premio/logro */}
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              {/* 📝 Texto del botón */}
              <div>
                <h3 className="font-semibold text-green-900">Explorar Repositorio</h3>
                <p className="text-sm text-green-700">Encuentra actividades</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};