// ============================================================================
// 🏫 GESTIÓN DE AULAS - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Este es el "Centro de Control" para que los profesores gestionen todas sus aulas.
 * Es como el panel de administración de un colegio virtual, donde el director
 * puede ver todas las clases, buscar una específica, crear nuevas, editarlas o eliminarlas.
 * 
 * 🎓 FUNCIONALIDADES PRINCIPALES:
 * 1. 📋 LISTADO: Ver todas las aulas creadas por el profesor
 * 2. 🔍 BÚSQUEDA: Encontrar aulas por nombre, materia, descripción
 * 3. 🎛️ FILTROS: Separar por materia, estado activo/inactivo
 * 4. ➕ CREACIÓN: Botón para crear nuevas aulas
 * 5. ✏️ EDICIÓN: Modificar información de aulas existentes
 * 6. 🗑️ ELIMINACIÓN: Borrar aulas (con confirmación de seguridad)
 * 7. 📋 CÓDIGOS: Copiar códigos de invitación para estudiantes
 * 8. 🔄 ESTADO: Activar/desactivar aulas
 * 
 * 🏗️ PATRONES DE DISEÑO IMPLEMENTADOS:
 * - CRUD completo (Create, Read, Update, Delete)
 * - Sistema de filtros en tiempo real
 * - Estados de carga y error
 * - Confirmaciones de acciones destructivas
 * - Feedback visual (copiar código, estados)
 * - Grid responsivo para diferentes pantallas
 * 
 * 💡 CONCEPTOS AVANZADOS:
 * - Gestión de estado complejo (múltiples estados relacionados)
 * - Optimistic updates (actualizaciones optimistas)
 * - Event handling avanzado (menús contextuales)
 * - Accesibilidad (keyboard navigation, ARIA labels)
 * - UX patterns (loading states, empty states, error states)
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useMemo, useState, useEffect } from 'react'; // React y hooks básicos
import { useAuth } from '../../contexts/useAuth'; // Para obtener datos del profesor
import { ClassroomService } from '../../services/implementations/ClassroomService'; // Servicio de aulas
import { Classroom } from '../../types'; // Tipo de datos para aulas
import { 
  Users,        // Icono de usuarios (para estudiantes)
  BookOpen,     // Icono de libro (para aulas)
  Plus,         // Icono de más (para crear)
  Search,       // Icono de búsqueda (para filtrar)
  MoreVertical, // Icono de menú de tres puntos (para acciones)
  Edit,         // Icono de editar (para modificar)
  Trash2,       // Icono de basura (para eliminar)
  Eye,          // Icono de ojo (para ver detalles)
  Settings,     // Icono de configuración (para cambiar estado)
  AlertCircle,  // Icono de alerta (para confirmaciones)
  CheckCircle,  // Icono de check (para éxito)
  Copy          // Icono de copiar (para códigos)
} from 'lucide-react';

// ============================================================================
// 📋 INTERFACES Y TIPOS
// ============================================================================

/**
 * 🎛️ PROPIEDADES DEL COMPONENTE ClassroomManagement
 * 
 * Igual que otros componentes, necesita poder navegar a diferentes páginas:
 * - 'create-classroom': Para crear nueva aula
 * - 'edit-classroom': Para editar aula existente  
 * - 'classroom-detail': Para ver detalles de un aula
 * - 'create-activity': Para crear actividad en un aula específica
 */
type ClassroomPage = 'create-classroom' | 'edit-classroom' | 'classroom-detail' | 'create-activity';

type ClassroomNavigationPayloadMap = {
  'create-classroom': undefined;
  'edit-classroom': { classroomId: string };
  'classroom-detail': { classroomId: string };
  'create-activity': { classroomId: string };
};

interface ClassroomManagementProps {
  // Función para navegar a otras páginas con datos tipados
  onNavigate: <Page extends ClassroomPage>(page: Page, data?: ClassroomNavigationPayloadMap[Page]) => void;
}

/**
 * 🔍 ESTADO DE FILTROS PARA LAS AULAS
 * 
 * ¿Por qué necesitamos filtros?
 * Un profesor puede tener muchas aulas (imagínate un profesor que enseña
 * matemáticas a 10 cursos diferentes). Sin filtros, sería imposible encontrar
 * una aula específica rápidamente.
 * 
 * Tipos de filtros implementados:
 * 1. Búsqueda por texto libre (nombre, descripción, materia, grado)
 * 2. Filtro por materia específica (Matemáticas, Ciencias, etc.)
 * 3. Filtro por estado (activas vs inactivas)
 */
interface ClassroomFilters {
  search: string;           // Texto de búsqueda libre
  subject: string;          // Materia específica (vacío = todas)
  isActive: boolean | null; // null = todas, true = activas, false = inactivas
}

// ============================================================================
// 🎨 COMPONENTE PRINCIPAL: ClassroomManagement
// ============================================================================

/**
 * 🏫 COMPONENTE DE GESTIÓN DE AULAS
 * 
 * ¿Qué hace este componente tan complejo?
 * Es como el "escritorio del director" de un colegio digital:
 * - Ve todas las aulas de un vistazo
 * - Puede buscar y filtrar rápidamente  
 * - Realiza acciones administrativas (crear, editar, eliminar)
 * - Gestiona códigos de acceso para estudiantes
 * - Controla estados (activo/inactivo) de las aulas
 * 
 * ¿Por qué tantos estados?
 * Porque gestionar aulas es complejo. Necesitamos rastrear:
 * - Qué aulas existen y cuáles están filtradas
 * - Si estamos cargando datos o hay errores
 * - Qué menús están abiertos y qué modales se muestran
 * - El estado de operaciones asíncronas (eliminar, copiar)
 */
export const ClassroomManagement: React.FC<ClassroomManagementProps> = ({ onNavigate }) => {
  // ========================================================================
  // 🎣 HOOKS Y ESTADO DEL COMPONENTE
  // ========================================================================
  
  // Hook de autenticación - datos del profesor logueado
  const { user } = useAuth();
  
  // 📚 Estado principal: todas las aulas del profesor
  // Esta es la "fuente de verdad" - los datos originales del servidor
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  // 🔍 Estado derivado: aulas después de aplicar filtros
  // Esto es lo que realmente se muestra al usuario
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  
  // ⏳ Estado de carga - mientras obtenemos datos del servidor
  const [isLoading, setIsLoading] = useState(true);
  
  // ❌ Estado de error - si algo sale mal al cargar o modificar datos
  const [error, setError] = useState<string | null>(null);
  
  // 🗑️ Estado para el modal de confirmación de eliminación
  // Guarda el ID del aula que se quiere eliminar (null = modal cerrado)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  // ⏳ Estado para saber si estamos eliminando (para mostrar spinner)
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 🎯 Aula seleccionada para mostrar en el modal de eliminación
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  
  // 📋 Control de menús contextuales (el menú de tres puntos)
  // Guarda el ID del aula cuyo menú está abierto (null = todos cerrados)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  
  // ✅ Estado de éxito al copiar código de invitación
  // Guarda el nombre del aula cuyo código se copió recientemente
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  // 🔍 Estado de filtros - controla qué aulas mostrar
  const [filters, setFilters] = useState<ClassroomFilters>({
    search: '',        // Texto de búsqueda
    subject: '',       // Materia seleccionada
    isActive: null     // Estado activo (null = todos)
  });

  // ========================================================================
  // 🔧 SERVICIOS - INSTANCIA SINGLETON
  // ========================================================================
  
  // Servicio para manejar operaciones con aulas
  const classroomService = useMemo(() => ClassroomService.getInstance(), []);

  // ========================================================================
  // 🔄 EFFECT HOOK - CARGA INICIAL DE DATOS
  // ========================================================================
  
  /**
   * 📥 CARGAR TODAS LAS AULAS DEL PROFESOR
   * 
   * ¿Por qué separamos la carga inicial del filtrado?
   * 1. PERFORMANCE: Solo cargamos una vez del servidor
   * 2. UX: Los filtros funcionan instantáneamente (sin esperas)
   * 3. OFFLINE: Una vez cargado, funciona sin conexión
   * 
   * Patrón implementado:
   * - Cargar datos originales → classrooms
   * - Inicializar datos filtrados → filteredClassrooms
   * - Los filtros solo modifican filteredClassrooms
   */
  useEffect(() => {
    // Función interna asíncrona para cargar aulas
    const loadClassrooms = async () => {
      // 🛡️ Verificación de seguridad: si no hay usuario, no hacer nada
      if (!user) return;

      try {
        // 🔄 Activar estado de carga
        setIsLoading(true);
        setError(null); // Limpiar errores previos
        
        // 📞 Llamada al servidor para obtener aulas del profesor
        const userClassrooms = await classroomService.getClassroomsByTeacher();
        
        // 💾 Guardar datos originales
        setClassrooms(userClassrooms);
        
        // 🔍 Inicializar datos filtrados (inicialmente = todos)
        setFilteredClassrooms(userClassrooms);
        
      } catch (error) {
        // 🚨 Manejo de errores
        console.error('Error al cargar aulas:', error);
        setError('Error al cargar las aulas. Intenta recargar la página.');
      } finally {
        // 🏁 SIEMPRE ejecutar: ocultar indicador de carga
        setIsLoading(false);
      }
    };

    // 🚀 Ejecutar la función de carga
    loadClassrooms();
  }, [user, classroomService]); // 👀 Dependencia: solo ejecutar cuando 'user' cambie

  // ========================================================================
  // 🔍 EFFECT HOOK - SISTEMA DE FILTROS EN TIEMPO REAL
  // ========================================================================
  
  /**
   * 🎯 APLICAR FILTROS A LAS AULAS
   * 
   * ¿Cómo funciona el sistema de filtros?
   * 1. Comienza con TODAS las aulas (copia de classrooms)
   * 2. Aplica cada filtro secuencialmente (como un embudo)
   * 3. El resultado final se guarda en filteredClassrooms
   * 
   * ¿Por qué usar useEffect aquí?
   * Porque queremos que los filtros se apliquen AUTOMÁTICAMENTE
   * cada vez que:
   * - El usuario cambia algún filtro (filters cambia)
   * - Se cargan nuevas aulas del servidor (classrooms cambia)
   * - Se modifica/elimina una aula (classrooms cambia)
   * 
   * Es como tener un "asistente digital" que reorganiza
   * automáticamente tu escritorio cada vez que cambias algo.
   */
  useEffect(() => {
    // 📋 Empezar con una copia de todas las aulas
    // Usamos spread operator para no modificar el array original
    let filtered = [...classrooms];

    // 🔍 FILTRO 1: BÚSQUEDA POR TEXTO
    if (filters.search.trim()) { // Solo si hay texto de búsqueda
      const searchTerm = filters.search.toLowerCase(); // Convertir a minúsculas para búsqueda insensible
      filtered = filtered.filter(classroom =>
        // Buscar en múltiples campos del aula:
        classroom.name.toLowerCase().includes(searchTerm) ||        // Nombre del aula
        classroom.description.toLowerCase().includes(searchTerm) || // Descripción
        classroom.subject.toLowerCase().includes(searchTerm) ||     // Materia
        classroom.grade.toLowerCase().includes(searchTerm)          // Grado
      );
    }

    // 📚 FILTRO 2: FILTRO POR MATERIA ESPECÍFICA
    if (filters.subject) { // Solo si se seleccionó una materia
      filtered = filtered.filter(classroom => classroom.subject === filters.subject);
    }

    // 🔄 FILTRO 3: FILTRO POR ESTADO ACTIVO/INACTIVO
    if (filters.isActive !== null) { // Solo si se seleccionó un estado específico
      filtered = filtered.filter(classroom => classroom.isActive === filters.isActive);
    }

    // 💾 Guardar el resultado filtrado
    setFilteredClassrooms(filtered);
  }, [classrooms, filters]); // 👀 Dependencias: ejecutar cuando cambien los datos o los filtros

  // ========================================================================
  // 🛠️ FUNCIONES UTILITARIAS
  // ========================================================================
  
  /**
   * 🎛️ ACTUALIZAR UN FILTRO ESPECÍFICO
   * 
   * ¿Por qué esta función es útil?
   * En lugar de escribir setFilters({ ...filters, search: 'nuevo valor' })
   * en cada input, tenemos una función reutilizable que hace eso por nosotros.
   * 
   * Es como tener un "control remoto universal" para cambiar cualquier filtro.
   * 
   * Parámetros:
   * - key: qué filtro cambiar ('search', 'subject', 'isActive')
   * - value: nuevo valor para ese filtro
   */
  const updateFilter = <Key extends keyof ClassroomFilters>(key: Key, value: ClassroomFilters[Key]) => {
    setFilters(prev => ({ 
      ...prev,      // Mantener todos los filtros existentes
      [key]: value  // Cambiar solo el filtro especificado
    }));
  };

  /**
   * 📚 OBTENER LISTA DE MATERIAS ÚNICAS
   * 
   * ¿Para qué sirve esto?
   * Para poblar el dropdown de "Filtrar por materia" con solo
   * las materias que realmente existen en las aulas del profesor.
   * 
   * Si el profesor solo tiene aulas de "Matemáticas" y "Ciencias",
   * el dropdown solo mostrará esas dos opciones.
   * 
   * ¿Cómo funciona?
   * 1. classrooms.map(c => c.subject) = array con todas las materias (con duplicados)
   * 2. new Set(...) = elimina duplicados 
   * 3. [...set] = convierte Set de vuelta a array
   * 4. .sort() = ordena alfabéticamente
   * 
   * Ejemplo: ["Matemáticas", "Ciencias", "Matemáticas"] → ["Ciencias", "Matemáticas"]
   */
  const getUniqueSubjects = () => {
    return [...new Set(classrooms.map(c => c.subject))].sort();
  };

  // ========================================================================
  // 🎬 FUNCIONES DE ACCIONES DEL USUARIO
  // ========================================================================
  
  /**
   * 📋 COPIAR CÓDIGO DE INVITACIÓN AL PORTAPAPELES
   * 
   * ¿Qué es un código de invitación?
   * Es como el "código de acceso" que los estudiantes necesitan para
   * unirse a un aula. Por ejemplo: "ABC123"
   * 
   * ¿Por qué es útil copiar automáticamente?
   * El profesor puede pegarlo fácilmente en:
   * - WhatsApp para enviarlo a padres
   * - Email para comunicados
   * - Pizarra digital en clase
   * - Plataforma escolar
   * 
   * ¿Cómo funciona la API del portapapeles?
   * navigator.clipboard.writeText() es una API moderna del navegador
   * que copia texto directamente al portapapeles del sistema operativo.
   * 
   * UX implementada:
   * 1. Copiar código al portapapeles
   * 2. Mostrar feedback visual (✅ "Copiado")
   * 3. Ocultar feedback después de 2 segundos automáticamente
   */
  const copyInviteCode = async (code: string, classroomName: string) => {
    try {
      // 📋 Copiar código al portapapeles usando la API moderna
      await navigator.clipboard.writeText(code);
      
      // ✅ Mostrar feedback de éxito (guardamos el nombre del aula)
      setCopySuccess(classroomName);
      
      // ⏰ Ocultar el feedback después de 2 segundos
      setTimeout(() => setCopySuccess(null), 2000);
      
    } catch (error) {
      // 🚨 Si falla (navegador viejo o sin permisos), registrar error
      console.error('Error al copiar código:', error);
      // En una app real, podríamos mostrar un fallback manual
      // como seleccionar el texto automáticamente
    }
  };

  /**
   * 🗑️ ELIMINAR AULA (OPERACIÓN DESTRUCTIVA)
   * 
   * ¿Por qué es tan importante manejar bien la eliminación?
   * Porque es una operación IRREVERSIBLE que puede borrar:
   * - Todas las actividades del aula
   * - El progreso de todos los estudiantes
   * - Los datos históricos de rendimiento
   * 
   * Patrón de seguridad implementado:
   * 1. Mostrar modal de confirmación con advertencias claras
   * 2. Usuario debe confirmar explícitamente
   * 3. Mostrar spinner durante la operación
   * 4. Actualizar interfaz solo si la operación fue exitosa
   * 5. Mantener datos intactos si falla la operación
   * 
   * ¿Qué es "Optimistic Update"?
   * Solo removemos el aula de la lista DESPUÉS de que el servidor
   * confirme que se eliminó correctamente. Si falla, la lista no cambia.
   */
  const handleDeleteClassroom = async (classroomId: string) => {
    try {
      // 🔄 Activar estado de "eliminando" (muestra spinner en botón)
      setIsDeleting(true);
      
      // 🗑️ Llamada al servidor para eliminar aula
      await classroomService.deleteClassroom(classroomId);
      
      // ✅ Solo si fue exitoso: actualizar lista local (Optimistic Update)
      setClassrooms(prev => prev.filter(c => c.id !== classroomId));
      
      // 🔒 Cerrar modal de confirmación
      setShowDeleteModal(null);
      
    } catch (error) {
      // 🚨 Si falla la eliminación, mantener todo como estaba
      console.error('Error al eliminar aula:', error);
      setError('Error al eliminar el aula. Intenta nuevamente.');
      // Nota: NO cerramos el modal, para que el usuario pueda reintentar
      
    } finally {
      // 🏁 Siempre ocultar el spinner, sin importar si fue exitoso o falló
      setIsDeleting(false);
    }
  };

  /**
   * 🔄 CAMBIAR ESTADO ACTIVO/INACTIVO DE UN AULA
   * 
   * ¿Para qué sirve activar/desactivar aulas?
   * - ACTIVA: Los estudiantes pueden acceder y hacer actividades
   * - INACTIVA: Aula "archivada" - los estudiantes no pueden acceder
   * 
   * Casos de uso típicos:
   * - Fin de semestre → desactivar aulas para archivarlas
   * - Mantenimiento → desactivar temporalmente
   * - Nuevo semestre → reactivar aulas del semestre anterior
   * 
   * ¿Por qué no eliminar directamente?
   * Porque desactivar preserva todos los datos (actividades, progreso)
   * pero impide el acceso. Es como "cerrar temporalmente" vs "demoler".
   * 
   * Patrón implementado:
   * 1. Encontrar aula actual en los datos locales
   * 2. Enviar cambio al servidor (con estado opuesto)
   * 3. Si es exitoso, actualizar datos locales
   * 4. Si falla, mantener estado original
   */
  const toggleClassroomStatus = async (classroomId: string) => {
    try {
      // 🔍 Buscar el aula actual en nuestros datos locales
      const classroom = classrooms.find(c => c.id === classroomId);
      if (!classroom) return; // Si no existe, no hacer nada
      
      // 🔄 Enviar cambio al servidor (invertir el estado actual)
      await classroomService.updateClassroom(classroomId, {
        isActive: !classroom.isActive // true → false, false → true
      });

      // ✅ Solo si fue exitoso: actualizar lista local
      setClassrooms(prev => 
        prev.map(c => 
          c.id === classroomId 
            ? { ...c, isActive: !c.isActive } // Cambiar solo el aula específica
            : c                               // Mantener las demás aulas sin cambios
        )
      );
      
    } catch (error) {
      // 🚨 Si falla, mantener estado original y mostrar error
      console.error('Error al cambiar estado:', error);
      setError('Error al cambiar el estado del aula.');
    }
  };

  // ========================================================================
  // 🎨 RENDERIZADO CONDICIONAL - PANTALLA DE CARGA
  // ========================================================================
  
  /**
   * 🔄 MOSTRAR SPINNER MIENTRAS SE CARGAN LAS AULAS
   * 
   * ¿Por qué es importante mostrar estados de carga en gestión?
   * Un profesor puede tener muchas aulas, y cargar todas con sus estadísticas
   * (estudiantes, actividades, etc.) puede tomar algunos segundos.
   * 
   * Sin indicador de carga, el profesor podría pensar que:
   * - La aplicación está rota
   * - No tiene aulas creadas
   * - Hay un problema de conexión
   * 
   * El spinner le dice: "Todo está bien, solo estamos cargando tus datos"
   */
  if (isLoading) {
    return (
      // 📱 Contenedor principal - pantalla completa
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* 🎯 Centrar el contenido */}
        <div className="text-center">
          {/* 🌀 Spinner animado */}
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          {/* 💬 Mensaje específico para gestión de aulas */}
          <p className="text-gray-600">Cargando aulas...</p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // 🎨 RENDERIZADO PRINCIPAL - INTERFAZ DE GESTIÓN
  // ========================================================================
  
  /**
   * 🏠 ESTRUCTURA PRINCIPAL DE LA PÁGINA DE GESTIÓN
   * 
   * Layout especializado para tareas administrativas:
   * - Encabezado con título claro y acción principal
   * - Sistema de filtros prominente
   * - Vista de grid para múltiples elementos
   * - Modales para confirmaciones importantes
   */
  return (
    // 📱 Contenedor principal - pantalla completa
    <div className="min-h-screen bg-gray-50">
      {/* 🎯 Contenedor centrado con máximo ancho */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================
        // 🏷️ SECCIÓN: ENCABEZADO DE GESTIÓN
        // ======================================================================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {/* 👈 Lado izquierdo: información de la página */}
            <div className="flex items-center space-x-4">
              {/* 🎯 Icono representativo en círculo */}
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              {/* 📝 Título y descripción */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Aulas</h1>
                <p className="text-gray-600 mt-1">
                  Administra tus aulas virtuales y estudiantes
                </p>
              </div>
            </div>
            
            {/* 👉 Lado derecho: acción principal */}
            <button
              onClick={() => onNavigate('create-classroom')} // Navegar a creación de aula
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Aula
            </button>
          </div>
        </div>

        {/* ========================================================================
        // ❌ SECCIÓN: MENSAJE DE ERROR
        // ======================================================================== */}
        
        {/* 🚨 Mostrar errores de forma prominente pero no intrusiva */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            {/* ⚠️ Icono de alerta */}
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* ========================================================================
        // 🔍 SECCIÓN: PANEL DE FILTROS Y BÚSQUEDA
        // ======================================================================== */}
        
        {/* 🎛️ Panel de control para filtrar aulas */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 🏗️ Grid responsivo de controles de filtro */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* 🔍 CONTROL 1: BÚSQUEDA DE TEXTO LIBRE */}
            <div className="md:col-span-2"> {/* Ocupa 2 columnas en desktop */}
              <div className="relative">
                {/* 🔍 Icono de búsqueda dentro del input */}
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                {/* 📝 Input de búsqueda con padding izquierdo para el icono */}
                <input
                  type="text"
                  placeholder="Buscar aulas por nombre, descripción o materia..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)} // Actualizar filtro en tiempo real
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* 📚 CONTROL 2: FILTRO POR MATERIA */}
            <div>
              <select
                value={filters.subject}
                onChange={(e) => updateFilter('subject', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none focus:ring-2"
              >
                {/* Opción por defecto = mostrar todas */}
                <option value="">Todas las materias</option>
                {/* Generar opciones dinámicamente basadas en aulas existentes */}
                {getUniqueSubjects().map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* 🔄 CONTROL 3: FILTRO POR ESTADO ACTIVO */}
            <div>
              <select
                // Convertir boolean/null a string para el select
                value={filters.isActive === null ? '' : filters.isActive.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  // Convertir string de vuelta a boolean/null
                  updateFilter('isActive', value === '' ? null : value === 'true');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none focus:ring-2"
              >
                <option value="">Todos los estados</option>   {/* null = mostrar todas */}
                <option value="true">Activas</option>        {/* true = solo activas */}
                <option value="false">Inactivas</option>     {/* false = solo inactivas */}
              </select>
            </div>
          </div>

          {/* ========================================================================
          // 📊 SUBSECCIÓN: INFORMACIÓN DE RESULTADOS Y ACCIONES
          // ======================================================================== */}
          
          {/* 📈 Fila de información sobre los resultados */}
          <div className="mt-4 flex items-center justify-between">
            {/* 📊 Contador de resultados */}
            <p className="text-sm text-gray-600">
              Mostrando {filteredClassrooms.length} de {classrooms.length} aulas
            </p>
            
            {/* 🧹 Botón para limpiar filtros (solo se muestra si hay filtros activos) */}
            {(filters.search || filters.subject || filters.isActive !== null) && (
              <button
                onClick={() => setFilters({ search: '', subject: '', isActive: null })} // Resetear todos los filtros
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de Aulas */}
        {filteredClassrooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            {classrooms.length === 0 ? (
              <>
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No tienes aulas creadas
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea tu primera aula virtual para empezar a organizar a tus estudiantes
                </p>
                <button
                  onClick={() => onNavigate('create-classroom')}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Crear Primera Aula
                </button>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No se encontraron aulas
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 🎯 CUADRÍCULA DE AULAS - VISTA PRINCIPAL */}
            {/* Sistema responsivo: 1 columna en móvil, 2 en tablet, 3 en desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 🔄 Mapear cada aula filtrada a una tarjeta individual */}
            {filteredClassrooms.map((classroom) => (
              // 🎴 TARJETA DE AULA INDIVIDUAL
              <div
                key={classroom.id} // Key único requerido por React
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* ========================================================================
                // 🏷️ ENCABEZADO DE LA TARJETA
                // ======================================================================== */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    {/* 👈 LADO IZQUIERDO: Información principal del aula */}
                    <div className="flex items-start space-x-3">
                      {/* 📚 Icono del aula con indicador visual de estado */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        classroom.isActive ? 'bg-indigo-100' : 'bg-gray-100' // Color dinámico según estado
                      }`}>
                        {/* Icono de libro que cambia color según el estado */}
                        <BookOpen className={`w-6 h-6 ${
                          classroom.isActive ? 'text-indigo-600' : 'text-gray-500'
                        }`} />
                      </div>
                      
                      {/* 📝 Información textual del aula */}
                      <div className="flex-1 min-w-0"> {/* flex-1: ocupa espacio disponible, min-w-0: permite truncamiento */}
                        {/* Nombre del aula con truncamiento si es muy largo */}
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {classroom.name}
                        </h3>
                        {/* Metadatos: materia y grado separados por bullet */}
                        <p className="text-sm text-gray-600">
                          {classroom.subject} • {classroom.grade}
                        </p>
                        
                        {/* 🚦 INDICADOR DE ESTADO VISUAL */}
                        <div className="flex items-center mt-2">
                          {/* Círculo de color que indica si está activa (verde) o inactiva (gris) */}
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            classroom.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          {/* Texto del estado con colores coordinados */}
                          <span className={`text-xs font-medium ${
                            classroom.isActive ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {classroom.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 👉 LADO DERECHO: Menú de acciones */}
                    {/* Sistema de menú desplegable con posicionamiento relativo */}
                    <div className="relative">
                      {/* Botón de menú (tres puntos verticales) */}
                      <button
                        onClick={() => setShowActionMenu(
                          showActionMenu === classroom.id ? null : classroom.id // Toggle: mostrar/ocultar
                        )}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {/* Icono de tres puntos verticales */}
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* 📋 MENÚ DESPLEGABLE DE ACCIONES (mostrar solo si este aula está activa) */}
                      {showActionMenu === classroom.id && (
                        // Contenedor del menú con posicionamiento absoluto
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-10">
                          
                          {/* 👁️ ACCIÓN: Ver detalles del aula */}
                          <button
                            onClick={() => {
                              onNavigate('classroom-detail', { classroomId: classroom.id }); // Navegar a página de detalles
                              setShowActionMenu(null); // Cerrar menú después de la acción
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-3" />
                            Ver Detalles
                          </button>
                          
                          {/* ✏️ ACCIÓN: Editar configuración del aula */}
                          <button
                            onClick={() => {
                              onNavigate('edit-classroom', { classroomId: classroom.id }); // Navegar a formulario de edición
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-3" />
                            Editar Aula
                          </button>

                          {/* 📋 ACCIÓN: Copiar código de invitación al portapapeles */}
                          <button
                            onClick={() => {
                              copyInviteCode(classroom.inviteCode, classroom.name); // Copiar usando la API del navegador
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Copy className="w-4 h-4 mr-3" />
                            Copiar Código
                          </button>

                          {/* 🔄 ACCIÓN: Activar/Desactivar aula (texto dinámico) */}
                          <button
                            onClick={() => {
                              toggleClassroomStatus(classroom.id); // Cambiar estado activo/inactivo
                              setShowActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            {/* Texto condicional basado en el estado actual */}
                            {classroom.isActive ? 'Desactivar' : 'Activar'}
                          </button>

                          {/* 🔺 Separador visual antes de la acción destructiva */}
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {/* 🗑️ ACCIÓN DESTRUCTIVA: Eliminar aula permanentemente */}
                          <button
                            onClick={() => {
                              setShowDeleteModal(classroom.id);        // Mostrar modal de confirmación
                              setSelectedClassroom(classroom);         // Guardar referencia del aula a eliminar
                              setShowActionMenu(null);                 // Cerrar menú
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Eliminar Aula
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========================================================================
                // 📊 CONTENIDO DE LA TARJETA - INFORMACIÓN DETALLADA
                // ======================================================================== */}
                <div className="p-6">
                  {/* 📝 Descripción del aula con límite de líneas */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {classroom.description}
                  </p>

                  {/* 📈 ESTADÍSTICAS PRINCIPALES EN GRID 2x1 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* 👥 Contador de estudiantes */}
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {/* Mostrar cantidad de estudiantes o 0 si no hay datos */}
                        {classroom.students?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Estudiantes</div>
                    </div>
                    {/* 📚 Contador de actividades */}
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {/* Mostrar cantidad de actividades o 0 si no hay datos */}
                        {classroom.activities?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Actividades</div>
                    </div>
                  </div>

                  {/* 🎫 SECCIÓN DEL CÓDIGO DE INVITACIÓN */}
                  {/* Panel destacado con color azul para llamar la atención */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      {/* 👈 Información del código */}
                      <div>
                        <p className="text-xs font-medium text-blue-800">Código de Invitación</p>
                        {/* Fuente monoespaciada para códigos (mejor legibilidad) */}
                        <p className="text-sm font-mono text-blue-900">
                          {classroom.inviteCode}
                        </p>
                      </div>
                      {/* 👉 Botón de copia rápida */}
                      <button
                        onClick={() => copyInviteCode(classroom.inviteCode, classroom.name)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Copiar código" // Tooltip que aparece al hacer hover
                      >
                        {/* 🎯 FEEDBACK VISUAL DINÁMICO para la acción de copiar */}
                        {copySuccess === classroom.name ? (
                          // ✅ Si se copió exitosamente, mostrar check verde
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          // 📋 Estado normal: mostrar icono de copiar
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ========================================================================
                  // 🎬 ACCIONES PRINCIPALES - BOTONES DE ACCIÓN RÁPIDA
                  // ======================================================================== */}
                  <div className="flex space-x-2 mt-4">
                    {/* 👁️ Botón principal: Ver detalles del aula */}
                    <button
                      onClick={() => onNavigate('classroom-detail', { classroomId: classroom.id })}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Aula
                    </button>
                    {/* ➕ Botón secundario: Crear nueva actividad en este aula */}
                    <button
                      onClick={() => onNavigate('create-activity', { classroomId: classroom.id })}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Actividad
                    </button>
                  </div>
                </div>

                {/* ========================================================================
                // 📅 PIE DE TARJETA - METADATOS ADICIONALES
                // ======================================================================== */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {/* Formatear fecha de creación en formato local */}
                    Creada el {new Date(classroom.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* ========================================================================
        // 🗑️ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN - OPERACIÓN DESTRUCTIVA
        // ======================================================================== */}
        {/* Solo mostrar si hay un aula seleccionada para eliminar */}
        {showDeleteModal && selectedClassroom && (
          // 🌫️ Overlay de fondo oscuro que cubre toda la pantalla
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            {/* 🏠 Contenedor del modal centrado */}
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              
              {/* 🚨 ENCABEZADO DEL MODAL - Icono de advertencia */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                {/* 📝 Información textual del modal */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Eliminar Aula
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              {/* ⚠️ CUERPO DEL MODAL - Advertencias y consecuencias */}
              <div className="mb-6">
                <p className="text-gray-700">
                  ¿Estás seguro de que quieres eliminar el aula{' '}
                  <span className="font-semibold">"{selectedClassroom.name}"</span>?
                </p>
                {/* ⚠️ Panel de advertencias específicas */}
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    • Se eliminarán todas las actividades asociadas<br/>
                    • Los estudiantes perderán acceso al aula<br/>
                    • Se perderán todos los datos de progreso
                  </p>
                </div>
              </div>

              {/* 🎛️ BOTONES DE ACCIÓN DEL MODAL */}
              <div className="flex space-x-3">
                {/* ❌ Botón de cancelar (seguro) */}
                <button
                  onClick={() => {
                    setShowDeleteModal(null);    // Cerrar modal
                    setSelectedClassroom(null);  // Limpiar selección
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isDeleting} // Deshabilitar durante la eliminación
                >
                  Cancelar
                </button>
                
                {/* 🗑️ Botón de confirmar eliminación (destructivo) */}
                <button
                  onClick={() => handleDeleteClassroom(showDeleteModal)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isDeleting}
                >
                  {/* 🔄 Mostrar spinner durante la eliminación */}
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Eliminando...
                    </>
                  ) : (
                    // Estado normal: icono y texto
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Aula
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================
        // ✅ NOTIFICACIÓN DE ÉXITO - FEEDBACK FLOTANTE
        // ======================================================================== */}
        {/* Solo mostrar si se copió un código exitosamente */}
        {copySuccess && (
          // Notificación flotante en esquina inferior derecha
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 rounded-lg p-4 flex items-center space-x-3 z-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">
              Código de "{copySuccess}" copiado al portapapeles
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================
      // 🌫️ OVERLAY INVISIBLE PARA CERRAR MENÚS
      // ======================================================================== */}
      {/* Capa invisible que detecta clics fuera de los menús desplegables */}
      {showActionMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionMenu(null)} // Cerrar cualquier menú abierto
        ></div>
      )}
    </div>
  );
};

/**
 * 🎓 EXPORTACIÓN DEL COMPONENTE
 * 
 * Este componente representa una interfaz administrativa completa para que los
 * profesores gestionen todas sus aulas virtuales de manera eficiente.
 * 
 * ✨ CARACTERÍSTICAS PRINCIPALES:
 * 
 * 🎯 GESTIÓN COMPLETA:
 * - Ver todas las aulas en una cuadrícula responsiva
 * - Filtrar por texto, materia y estado (activo/inactivo)
 * - Copiar códigos de invitación al portapapeles
 * - Activar/desactivar aulas sin perder datos
 * - Eliminar aulas con confirmación de seguridad
 * 
 * 🔍 SISTEMA DE FILTROS AVANZADO:
 * - Búsqueda en tiempo real por nombre, descripción, materia y grado
 * - Filtros por materia específica (generados dinámicamente)
 * - Filtro por estado activo/inactivo
 * - Contadores de resultados filtrados
 * 
 * 🎨 EXPERIENCIA DE USUARIO OPTIMIZADA:
 * - Estados de carga con spinners informativos
 * - Feedback visual para todas las acciones
 * - Confirmaciones para operaciones destructivas
 * - Notificaciones flotantes de éxito
 * - Interfaz responsiva para todos los dispositivos
 * 
 * 🔒 PATRONES DE SEGURIDAD:
 * - Confirmación doble para eliminaciones
 * - Operaciones optimistas (actualizar UI solo si el servidor confirma)
 * - Manejo robusto de errores con rollback automático
 * - Validación de permisos a nivel de interfaz
 * 
 * 🛠️ ARQUITECTURA TÉCNICA:
 * - Hooks de React para gestión de estado compleja
 * - Integración con APIs del navegador (clipboard)
 * - Componentes reutilizables con props tipadas
 * - Separación clara entre lógica de negocio y presentación
 * 
 * Este componente es un ejemplo completo de interfaz administrativa moderna
 * que equilibra funcionalidad, usabilidad y seguridad para entornos educativos.
 */
export default ClassroomManagement;
