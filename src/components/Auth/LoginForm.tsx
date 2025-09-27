// ============================================================================
// 🚪 COMPONENTE DE FORMULARIO DE LOGIN - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE COMPONENTE?
 * Este es el formulario donde los usuarios ingresan sus credenciales para
 * acceder a la aplicación. Es la "puerta de entrada" al sistema.
 * 
 * 🔧 FUNCIONALIDADES PRINCIPALES:
 * - 📝 Recopilar email y contraseña del usuario
 * - ✅ Validar que los campos estén completos
 * - 🔐 Mostrar/ocultar contraseña con botón de ojo
 * - 🚀 Enviar credenciales al servidor para autenticación
 * - 🚨 Mostrar errores si las credenciales son incorrectas
 * - 🔄 Mostrar estado de carga mientras se procesa el login
 * - 🔗 Permitir cambiar al formulario de registro
 * 
 * 💡 PRINCIPIOS APLICADOS:
 * - React Hooks: useState para manejar estado local
 * - Controlled Components: Inputs controlados por React
 * - Error Handling: Manejo robusto de errores de autenticación
 * - UX: Feedback visual al usuario en todo momento
 * - Accessibility: Formulario accesible con labels y roles apropiados
 * 
 * 🎨 DISEÑO:
 * - Interfaz limpia y minimalista
 * - Animaciones suaves con Tailwind CSS
 * - Iconos de Lucide React para mejor UX
 * - Responsive design para móviles y desktop
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useState } from 'react';                                        // React y hook de estado
import { LogIn, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';    // Iconos para la interfaz
import { useAuth } from '../../contexts/AuthContext';                          // Hook de autenticación

/**
 * 📋 PROPIEDADES DEL COMPONENTE
 * 
 * Define qué datos recibe este componente desde su componente padre.
 * En este caso, solo necesita una función para cambiar al registro.
 */
interface LoginFormProps {
  onSwitchToRegister: () => void;    // 🔄 Función para cambiar al formulario de registro
}

/**
 * 🎭 COMPONENTE PRINCIPAL DEL FORMULARIO DE LOGIN
 * 
 * Este es un componente funcional de React que renderiza el formulario de login.
 * Recibe las props definidas en la interfaz LoginFormProps.
 * 
 * @param onSwitchToRegister - Función para cambiar al formulario de registro
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  
  // 🔐 OBTENER FUNCIONES DE AUTENTICACIÓN DEL CONTEXTO
  // useAuth() nos conecta con el sistema global de autenticación
  const { login, isLoading } = useAuth();
  
  // ================================
  // 📊 ESTADOS LOCALES DEL COMPONENTE
  // ================================
  
  // 👁️ Estado para mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false);
  
  // 📝 Estado para los datos del formulario
  const [formData, setFormData] = useState({
    email: '',        // 📧 Email del usuario
    password: '',     // 🔒 Contraseña del usuario
  });
  
  // 🚨 Estado para mensajes de error
  const [error, setError] = useState('');

  // ================================
  // 🎯 FUNCIONES DEL COMPONENTE
  // ================================

  /**
   * 🚀 MANEJAR ENVÍO DEL FORMULARIO
   * 
   * Esta función se ejecuta cuando el usuario hace clic en "Iniciar Sesión"
   * o presiona Enter en el formulario. Es el corazón del proceso de login.
   * 
   * Proceso paso a paso:
   * 1. 🛑 Prevenir el comportamiento por defecto del navegador
   * 2. 🧹 Limpiar mensajes de error anteriores
   * 3. ✅ Validar que todos los campos estén completos
   * 4. 🌐 Enviar credenciales al servidor via AuthContext
   * 5. 🚨 Mostrar error si el login falla
   * 
   * @param e - Evento del formulario HTML
   */
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 Enviando formulario de login'); // Debug log
    
    // 🛑 PREVENIR RECARGA DE PÁGINA
    // Por defecto, los formularios HTML recargan la página al enviarse
    // preventDefault() evita esto para que podamos manejar el envío con JavaScript
    e.preventDefault();
    
    // 🧹 LIMPIAR ERRORES ANTERIORES
    // Cada nuevo intento de login empieza "limpio"
    setError('');
    
    // ✅ VALIDACIÓN BÁSICA DE CAMPOS
    if (!formData.email || !formData.password) {
      console.log('❌ Validación fallida - campos vacíos'); // Debug log
      setError('Por favor completa todos los campos');
      return; // Salir sin hacer el login
    }
    
    // 📧 VALIDACIÓN BÁSICA DE FORMAT DE EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      console.log('❌ Validación fallida - email inválido'); // Debug log
      setError('Por favor ingresa un email válido');
      return;
    }
    
    console.log('📤 Enviando credenciales al servidor'); // Debug log
    
    // 🌐 ENVIAR CREDENCIALES AL SERVIDOR
    // El hook useAuth() maneja toda la lógica de comunicación con el backend
    const result = await login(formData);
    
    // 🚨 MANEJAR RESULTADO DEL LOGIN
    if (!result.success) {
      console.log('❌ Login fallido:', result.error); // Debug log
      setError(result.error || 'Error al iniciar sesión. Inténtalo de nuevo.');
    } else {
      console.log('✅ Login exitoso'); // Debug log
      // Si el login es exitoso, el AuthContext se encarga de actualizar
      // el estado global y redirigir al usuario automáticamente
    }
  };

  /**
   * 📝 MANEJAR CAMBIOS EN LOS INPUTS
   * 
   * Esta función se ejecuta cada vez que el usuario escribe en un campo.
   * Actualiza el estado local con el nuevo valor y limpia errores.
   * 
   * ¿Por qué usar una función genérica?
   * En lugar de crear handleEmailChange, handlePasswordChange, etc.,
   * usamos una función que puede manejar cualquier campo.
   * 
   * @param field - Nombre del campo que cambió ('email' o 'password')
   * @param value - Nuevo valor del campo
   */
  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 Campo ${field} cambió a:`, value.length, 'caracteres'); // Debug log (no mostrar valor por seguridad)
    
    // 🔄 ACTUALIZAR ESTADO DEL FORMULARIO
    setFormData(prev => ({
      ...prev,          // Mantener otros campos sin cambios
      [field]: value,   // Actualizar solo el campo que cambió
    }));
    
    // 🧹 LIMPIAR ERROR CUANDO EL USUARIO EMPIECE A ESCRIBIR
    if (error) {
      setError('');
    }
  };

  /**
   * 🚀 FUNCIÓN PARA LLENAR DATOS DE DEMOSTRACIÓN
   * 
   * Esta función permite a los usuarios probar la aplicación rápidamente
   * sin tener que escribir un email y contraseña manualmente.
   * 
   * ¿Para qué sirve?
   * - Facilita las pruebas durante desarrollo
   * - Permite a nuevos usuarios probar la app sin crear cuenta
   * - Demuestra las diferencias entre rol de profesor y estudiante
   * 
   * @param role - Tipo de usuario ('teacher' = profesor, 'student' = estudiante)
   */
  const fillDemoData = (role: 'teacher' | 'student') => {
    console.log(`🎭 Llenando datos de demo para:`, role); // Log para debug
    
    // 📝 Actualizar el formulario con datos predefinidos según el rol
    setFormData({
      email: role === 'teacher' ? 'teacher@demo.com' : 'student@demo.com', // Email según rol
      password: 'password123',                                             // Contraseña común para ambos
    });
  };

  /**
   * 🎨 RENDERIZADO DEL COMPONENTE (JSX)
   * 
   * Esta es la estructura visual de nuestro formulario de login.
   * Está organizada en secciones para facilitar el mantenimiento.
   */
  return (
    // 🌟 CONTENEDOR PRINCIPAL CON DISEÑO RESPONSIVO
    // min-h-screen: Altura mínima de toda la pantalla
    // bg-gradient-to-br: Degradado de fondo desde arriba-izquierda a abajo-derecha
    // from-indigo-50 via-white to-purple-50: Colores del degradado
    // flex items-center justify-center: Centrar contenido vertical y horizontalmente
    // py-12 px-4: Padding vertical 12, horizontal 4
    // sm:px-6 lg:px-8: Padding horizontal responsivo (6 en pantallas sm, 8 en lg)
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* 📦 CONTENEDOR DEL FORMULARIO */}
      {/* max-w-md: Ancho máximo mediano */}
      {/* w-full: Ancho 100% hasta llegar al máximo */}
      {/* space-y-8: Espaciado vertical de 8 entre elementos hijos */}
      <div className="max-w-md w-full space-y-8">
        
        {/* 🏷️ CABECERA DEL FORMULARIO */}
        <div className="text-center"> {/* Centrar todo el texto */}
          
          {/* 🎯 ICONO PRINCIPAL */}
          {/* mx-auto: Centrar horizontalmente */}
          {/* h-16 w-16: Altura y ancho de 16 unidades (64px) */}
          {/* bg-indigo-600: Fondo azul índigo */}
          {/* rounded-full: Bordes completamente redondeados (círculo) */}
          {/* flex items-center justify-center: Centrar el icono dentro */}
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            {/* Icono de LogIn de Lucide React */}
            {/* h-8 w-8: Tamaño del icono (32px) */}
            {/* text-white: Color blanco */}
            <LogIn className="h-8 w-8 text-white" />
          </div>
          
          {/* 📝 TÍTULO PRINCIPAL */}
          {/* text-3xl: Tamaño de texto extra grande */}
          {/* font-bold: Texto en negrita */}
          {/* text-gray-900: Color gris muy oscuro (casi negro) */}
          <h2 className="text-3xl font-bold text-gray-900">
            Iniciar Sesión
          </h2>
          
          {/* 📄 SUBTÍTULO */}
          {/* mt-2: Margen superior de 2 unidades */}
          {/* text-sm: Tamaño de texto pequeño */}
          {/* text-gray-600: Color gris medio */}
          <p className="mt-2 text-sm text-gray-600">
            Ingresa a tu cuenta de AcaLud
          </p>
        </div>

        {/* 🎮 BOTONES DE DEMOSTRACIÓN */}
        {/* grid grid-cols-2: Layout de cuadrícula con 2 columnas */}
        {/* gap-3: Espacio de 3 unidades entre elementos */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* 👨‍🏫 BOTÓN DEMO DOCENTE */}
          <button
            type="button"                              // Tipo button para que no envíe el formulario
            onClick={() => fillDemoData('teacher')}   // Al hacer click, llenar datos de profesor
            // Clases de estilo:
            // px-4 py-2: Padding horizontal 4, vertical 2
            // text-sm: Texto pequeño
            // bg-blue-50: Fondo azul muy claro
            // text-blue-700: Texto azul oscuro
            // rounded-lg: Bordes redondeados grandes
            // hover:bg-blue-100: Al pasar el mouse, fondo azul más oscuro
            // transition-colors: Transición suave de colores
            // border border-blue-200: Borde azul claro
            className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
          >
            Demo Docente
          </button>
          
          {/* 👨‍🎓 BOTÓN DEMO ESTUDIANTE */}
          <button
            type="button"                               // Tipo button para que no envíe el formulario
            onClick={() => fillDemoData('student')}    // Al hacer click, llenar datos de estudiante
            // Clases similares al botón anterior pero en verde
            className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
          >
            Demo Estudiante
          </button>
        </div>

        {/* 📝 FORMULARIO PRINCIPAL DE LOGIN */}
        {/* mt-8: Margen superior de 8 unidades */}
        {/* space-y-6: Espaciado vertical de 6 entre elementos hijos */}
        {/* onSubmit={handleSubmit}: Cuando se envíe el form, ejecutar handleSubmit */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          
          {/* 🚨 MENSAJE DE ERROR */}
          {/* Solo se muestra si hay un error (renderizado condicional) */}
          {error && (
            // Contenedor del mensaje de error con estilos de alerta roja
            // bg-red-50: Fondo rojo muy claro
            // border border-red-200: Borde rojo claro
            // rounded-lg: Bordes redondeados
            // p-4: Padding de 4 unidades en todos los lados
            // flex items-center space-x-3: Layout flexbox, centrado vertical, espacio horizontal de 3
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              {/* Icono de alerta */}
              {/* h-5 w-5: Tamaño 5x5 (20px) */}
              {/* text-red-500: Color rojo medio */}
              {/* flex-shrink-0: No se encoge si falta espacio */}
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              
              {/* Texto del error */}
              {/* text-sm: Texto pequeño */}
              {/* text-red-700: Color rojo oscuro */}
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 📋 CONTENEDOR DE CAMPOS DEL FORMULARIO */}
          {/* space-y-4: Espaciado vertical de 4 entre campos */}
          <div className="space-y-4">
            
            {/* 📧 CAMPO DE EMAIL */}
            <div>
              {/* Etiqueta del campo */}
              {/* htmlFor: Conecta la etiqueta con el input (accesibilidad) */}
              {/* block: Display block para que ocupe toda la línea */}
              {/* text-sm: Texto pequeño */}
              {/* font-medium: Peso de fuente medio */}
              {/* text-gray-700: Color gris oscuro */}
              {/* mb-2: Margen inferior de 2 unidades */}
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              
              {/* 🎨 CONTENEDOR DEL INPUT CON ICONO */}
              {/* relative: Posicionamiento relativo para elementos absolutos dentro */}
              <div className="relative">
                
                {/* 📮 ICONO DE EMAIL */}
                {/* absolute: Posicionamiento absoluto */}
                {/* inset-y-0: Top y bottom en 0 (altura completa del input) */}
                {/* left-0: Posición izquierda en 0 */}
                {/* pl-3: Padding izquierdo de 3 */}
                {/* flex items-center: Centrar verticalmente */}
                {/* pointer-events-none: No intercepta clicks (para que lleguen al input) */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {/* Icono de Mail de Lucide React */}
                  {/* h-5 w-5: Tamaño 5x5 (20px) */}
                  {/* text-gray-400: Color gris claro */}
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* ✍️ INPUT DE EMAIL */}
                <input
                  id="email"                                          // ID que conecta con la etiqueta
                  name="email"                                        // Nombre del campo
                  type="email"                                        // Tipo email (validación automática del navegador)
                  autoComplete="email"                                // Permite autocompletado
                  required                                            // Campo obligatorio
                  value={formData.email}                              // Valor actual del estado
                  onChange={(e) => handleInputChange('email', e.target.value)} // Al cambiar, actualizar estado
                  // Clases de estilo del input:
                  // block w-full: Display block, ancho completo
                  // pl-10: Padding izquierdo de 10 (espacio para el icono)
                  // pr-3: Padding derecho de 3
                  // py-3: Padding vertical de 3
                  // border border-gray-300: Borde gris claro
                  // rounded-lg: Bordes redondeados grandes
                  // focus:outline-none: Sin outline al enfocar
                  // focus:ring-2: Ring de 2 al enfocar
                  // focus:ring-indigo-500: Ring azul índigo al enfocar
                  // focus:border-transparent: Borde transparente al enfocar
                  // transition-all: Transición suave en todas las propiedades
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"                          // Texto de ejemplo
                />
              </div>
            </div>

            {/* 🔒 CAMPO DE CONTRASEÑA */}
            <div>
              {/* Etiqueta del campo contraseña */}
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              
              {/* 🎨 CONTENEDOR DEL INPUT CON ICONOS */}
              <div className="relative">
                
                {/* 🔐 ICONO DE CANDADO */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* ✍️ INPUT DE CONTRASEÑA */}
                <input
                  id="password"                                        // ID que conecta con la etiqueta
                  name="password"                                      // Nombre del campo
                  type={showPassword ? 'text' : 'password'}            // Tipo dinámico: text si está visible, password si está oculta
                  autoComplete="current-password"                      // Permite autocompletado de contraseña
                  required                                             // Campo obligatorio
                  value={formData.password}                            // Valor actual del estado
                  onChange={(e) => handleInputChange('password', e.target.value)} // Al cambiar, actualizar estado
                  // Clases similares al input de email pero con pr-10 (padding derecho 10) para el botón de mostrar/ocultar
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Tu contraseña"                          // Texto de ejemplo
                />
                
                {/* 👁️ BOTÓN PARA MOSTRAR/OCULTAR CONTRASEÑA */}
                <button
                  type="button"                                        // Tipo button para que no envíe el formulario
                  // Posicionamiento absoluto en la derecha del input
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}       // Al hacer click, alternar visibilidad
                >
                  {/* 👁️ ICONO DINÁMICO SEGÚN ESTADO DE VISIBILIDAD */}
                  {/* Si showPassword es true, mostrar EyeOff (cerrado), si es false mostrar Eye (abierto) */}
                  {showPassword ? (
                    // Icono de ojo cerrado cuando la contraseña está visible
                    // h-5 w-5: Tamaño 5x5 (20px)
                    // text-gray-400: Color gris claro por defecto
                    // hover:text-gray-600: Color gris más oscuro al pasar el mouse
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    // Icono de ojo abierto cuando la contraseña está oculta
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 🚀 BOTÓN DE ENVÍO DEL FORMULARIO */}
          <div>
            <button
              type="submit"                                            // Tipo submit para enviar el formulario
              disabled={isLoading}                                     // Deshabilitado mientras está cargando
              // Clases del botón de envío:
              // group: Para efectos hover en elementos hijos
              // relative: Posicionamiento relativo
              // w-full: Ancho completo
              // flex justify-center: Flexbox centrado horizontalmente
              // py-3 px-4: Padding vertical 3, horizontal 4
              // border border-transparent: Borde transparente
              // text-sm font-medium: Texto pequeño y peso medio
              // rounded-lg: Bordes redondeados grandes
              // text-white: Texto blanco
              // bg-indigo-600: Fondo azul índigo
              // hover:bg-indigo-700: Fondo más oscuro al pasar el mouse
              // focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500: Estados de enfoque
              // disabled:opacity-50 disabled:cursor-not-allowed: Estilos cuando está deshabilitado
              // transition-all: Transición suave en todas las propiedades
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {/* 🔄 CONTENIDO DINÁMICO DEL BOTÓN SEGÚN ESTADO DE CARGA */}
              {isLoading ? (
                // Si está cargando, mostrar spinner y texto de carga
                <div className="flex items-center">
                  {/* 🌀 SPINNER DE CARGA */}
                  {/* w-5 h-5: Tamaño 5x5 (20px) */}
                  {/* border-2: Borde de 2px */}
                  {/* border-white: Color blanco del borde */}
                  {/* border-t-transparent: Parte superior transparente para crear efecto spinner */}
                  {/* rounded-full: Completamente redondo */}
                  {/* animate-spin: Animación de rotación */}
                  {/* mr-3: Margen derecho de 3 */}
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Iniciando sesión...
                </div>
              ) : (
                // Si no está cargando, mostrar icono y texto normal
                <>
                  {/* Icono de LogIn */}
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </div>

          {/* 🔄 ENLACE PARA CAMBIAR A REGISTRO */}
          {/* text-center: Texto centrado */}
          <div className="text-center">
            {/* text-sm: Texto pequeño */}
            {/* text-gray-600: Color gris medio */}
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}  {/* {' '} añade un espacio en JSX */}
              
              {/* 🔗 BOTÓN PARA CAMBIAR A FORMULARIO DE REGISTRO */}
              <button
                type="button"                                          // Tipo button para que no envíe el formulario
                onClick={onSwitchToRegister}                           // Al hacer click, ejecutar función de cambio
                // font-medium: Peso de fuente medio
                // text-indigo-600: Color azul índigo
                // hover:text-indigo-500: Color más claro al pasar el mouse  
                // transition-colors: Transición suave de colores
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * 📋 RESUMEN DEL COMPONENTE LoginForm
 * 
 * Este componente maneja el formulario de inicio de sesión de la aplicación AcaLud.
 * 
 * 🎯 CARACTERÍSTICAS PRINCIPALES:
 * - Formulario controlado con React useState
 * - Validación de campos en tiempo real
 * - Integración con AuthContext para autenticación
 * - Botones de demo para pruebas rápidas
 * - Diseño responsivo con Tailwind CSS
 * - Indicadores de carga y manejo de errores
 * - Opción de mostrar/ocultar contraseña
 * 
 * 🔧 TECNOLOGÍAS UTILIZADAS:
 * - React con TypeScript
 * - Tailwind CSS para styling
 * - Lucide React para iconos
 * - Context API para estado global
 * 
 * 🚀 FUNCIONALIDADES:
 * - Login con email y contraseña
 * - Validación de formulario
 * - Estados de carga
 * - Manejo de errores
 * - Datos de demostración
 * - Navegación a registro
 * 
 * 💡 PATRONES IMPLEMENTADOS:
 * - Controlled Components
 * - Event Handling
 * - Conditional Rendering
 * - State Management
 * - Error Boundaries
 */

// 📤 EXPORTACIÓN DEL COMPONENTE
// export default: Exportación por defecto para que pueda ser importado como LoginForm
export default LoginForm;