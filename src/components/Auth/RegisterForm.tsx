// ============================================================================
// 📝 COMPONENTE DE FORMULARIO DE REGISTRO - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE COMPONENTE?
 * Este es el formulario donde nuevos usuarios crean sus cuentas en la aplicación.
 * Es la "puerta de entrada" para que estudiantes y profesores se unan a AcaLud.
 * 
 * 🔧 FUNCIONALIDADES PRINCIPALES:
 * - 📝 Recopilar datos del nuevo usuario (nombre, email, contraseña, rol)
 * - ✅ Validar que los campos estén completos y sean válidos
 * - 🔐 Mostrar/ocultar contraseñas con botones de ojo
 * - 🚀 Enviar datos al servidor para crear la cuenta
 * - 🚨 Mostrar errores si algo falla en el proceso
 * - 🔄 Mostrar estado de carga durante el registro
 * - 🔗 Permitir cambiar al formulario de login
 * - 👥 Seleccionar el rol (estudiante o profesor)
 * 
 * 💡 PRINCIPIOS APLICADOS:
 * - React Hooks: useState para manejar estado local
 * - Controlled Components: Todos los inputs controlados por React
 * - Form Validation: Validaciones completas antes del envío
 * - Error Handling: Manejo robusto de errores de registro
 * - UX: Feedback visual claro al usuario
 * - Accessibility: Formulario accesible con labels y roles
 * 
 * 🎨 DISEÑO:
 * - Interfaz moderna con degradados y sombras
 * - Animaciones suaves con Tailwind CSS
 * - Iconos de Lucide React para mejor UX
 * - Responsive design para todos los dispositivos
 * - Selección visual de roles
 */

// 📦 IMPORTACIONES NECESARIAS
import React, { useState } from 'react';                                        // React y hook de estado
import { useAuth } from '../../contexts/AuthContext';                          // Hook de autenticación personalizado
import { BookOpen, Mail, Lock, Eye, EyeOff, User, GraduationCap } from 'lucide-react'; // Iconos para la interfaz

/**
 * 📋 PROPIEDADES DEL COMPONENTE RegisterForm
 * 
 * Define qué datos recibe este componente desde su componente padre.
 * En este caso, solo necesita una función para cambiar al formulario de login.
 */
interface RegisterFormProps {
  onSwitchToLogin: () => void;    // 🔄 Función para cambiar al formulario de login
}

/**
 * 📊 ESTRUCTURA DE DATOS DEL FORMULARIO DE REGISTRO
 * 
 * Define la forma de los datos que el usuario debe completar para registrarse.
 * Incluye validación básica de tipos con TypeScript.
 */
interface RegisterFormData {
  name: string;                   // 👤 Nombre completo del usuario
  email: string;                  // 📧 Correo electrónico (debe ser único)
  password: string;               // 🔒 Contraseña (mínimo 6 caracteres)
  confirmPassword: string;        // 🔒 Confirmación de contraseña (debe coincidir)
  role: 'teacher' | 'student';    // 👥 Rol del usuario (solo dos opciones válidas)
}

/**
 * 🎭 COMPONENTE PRINCIPAL DEL FORMULARIO DE REGISTRO
 * 
 * Este es un componente funcional de React que renderiza el formulario de registro.
 * Permite a nuevos usuarios crear cuentas como estudiantes o profesores.
 * 
 * @param onSwitchToLogin - Función para cambiar al formulario de login
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  
  // 🔐 OBTENER FUNCIONES DE AUTENTICACIÓN DEL CONTEXTO
  // useAuth() nos conecta con el sistema global de autenticación
  const { register, isLoading } = useAuth();
  
  // ================================
  // 📊 ESTADOS LOCALES DEL COMPONENTE
  // ================================
  
  // 📝 Estado para los datos del formulario de registro
  // Inicializamos con valores vacíos y rol por defecto 'student'
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',               // 👤 Nombre vacío al inicio
    email: '',              // 📧 Email vacío al inicio
    password: '',           // 🔒 Contraseña vacía al inicio
    confirmPassword: '',    // 🔒 Confirmación vacía al inicio
    role: 'student'         // 👥 Por defecto, el usuario es estudiante
  });
  
  // 👁️ Estados para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);             // Estado para la contraseña principal
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Estado para la confirmación de contraseña
  
  // 🚨 Estado para mensajes de error
  const [error, setError] = useState('');

  // ================================
  // 🎯 FUNCIONES DEL COMPONENTE
  // ================================

  /**
   * 🚀 MANEJAR ENVÍO DEL FORMULARIO DE REGISTRO
   * 
   * Esta función se ejecuta cuando el usuario hace clic en "Crear Cuenta"
   * o presiona Enter en el formulario. Es el corazón del proceso de registro.
   * 
   * Proceso paso a paso:
   * 1. 🛑 Prevenir el comportamiento por defecto del navegador
   * 2. 🧹 Limpiar mensajes de error anteriores
   * 3. ✅ Validar que todos los campos estén completos
   * 4. 🔐 Verificar que las contraseñas coincidan
   * 5. 📏 Validar longitud mínima de contraseña
   * 6. 🌐 Enviar datos al servidor via AuthContext
   * 7. 🚨 Mostrar error si el registro falla
   * 
   * @param e - Evento del formulario HTML
   */
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 Enviando formulario de registro'); // Debug log
    
    // 🛑 PREVENIR RECARGA DE PÁGINA
    // Por defecto, los formularios HTML recargan la página al enviarse
    // preventDefault() evita esto para que podamos manejar el envío con JavaScript
    e.preventDefault();
    
    // 🧹 LIMPIAR ERRORES ANTERIORES
    // Cada nuevo intento de registro empieza "limpio"
    setError('');
    
    // ✅ VALIDACIÓN DE CAMPOS OBLIGATORIOS
    // Verificamos que todos los campos necesarios estén completos
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      console.log('❌ Validación fallida - campos vacíos'); // Debug log
      setError('Por favor completa todos los campos');
      return; // Salir sin hacer el registro
    }

    // 🔐 VALIDACIÓN DE COINCIDENCIA DE CONTRASEÑAS
    // Las contraseñas deben ser exactamente iguales
    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Validación fallida - contraseñas no coinciden'); // Debug log
      setError('Las contraseñas no coinciden');
      return;
    }

    // 📏 VALIDACIÓN DE LONGITUD DE CONTRASEÑA
    // Mínimo 6 caracteres para seguridad básica
    if (formData.password.length < 6) {
      console.log('❌ Validación fallida - contraseña muy corta'); // Debug log
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // 📧 VALIDACIÓN BÁSICA DE EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      console.log('❌ Validación fallida - email inválido'); // Debug log
      setError('Por favor ingresa un email válido');
      return;
    }

    console.log('📤 Enviando datos de registro al servidor'); // Debug log

    try {
      // 🌐 ENVIAR DATOS AL SERVIDOR
      // Creamos un objeto con todos los datos necesarios para el registro
      const registrationData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role
      };
      
      // Llamar a la función de registro del contexto
      const result = await register(registrationData);
      
      // 🚨 MANEJAR RESULTADO DEL REGISTRO
      if (!result.success) {
        console.log('❌ Registro fallido:', result.error); // Debug log
        setError(result.error || 'Error al crear la cuenta. El email podría estar en uso.');
      } else {
        console.log('✅ Registro exitoso'); // Debug log
        // Si el registro es exitoso, el AuthContext se encarga de redirigir
      }
    } catch (err) {
      console.log('❌ Error en registro:', err); // Debug log
      setError('Error al crear la cuenta. Intenta nuevamente.');
    }
  };

  /**
   * 📝 MANEJAR CAMBIOS EN LOS INPUTS DEL FORMULARIO
   * 
   * Esta función se ejecuta cada vez que el usuario escribe en cualquier campo
   * del formulario (texto, email, contraseña, etc.) o cambia la selección del rol.
   * 
   * ¿Por qué una sola función para todos los campos?
   * Es más eficiente que crear handleNameChange, handleEmailChange, etc.
   * Usamos el atributo 'name' del input para identificar qué campo cambió.
   * 
   * @param e - Evento de cambio del input o select
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    console.log('📝 Campo del formulario cambió'); // Debug log
    
    // 🔍 EXTRAER DATOS DEL EVENTO
    // Obtenemos el nombre del campo y su nuevo valor
    const { name, value } = e.target;
    
    console.log(`📝 Campo ${name} cambió a:`, name === 'password' ? '[OCULTO]' : value); // Debug log (ocultar contraseñas)
    
    // 🔄 ACTUALIZAR ESTADO DEL FORMULARIO
    // Usamos el patrón de spread operator para mantener otros campos sin cambios
    setFormData(prev => ({
      ...prev,          // Mantener todos los campos anteriores
      [name]: value     // Actualizar solo el campo que cambió (usando computed property)
    }));
    
    // 🧹 LIMPIAR ERROR CUANDO EL USUARIO EMPIECE A ESCRIBIR
    // Si hay un error mostrado y el usuario empieza a corregir, lo ocultamos
    if (error) {
      console.log('🧹 Limpiando error porque el usuario está corrigiendo'); // Debug log
      setError('');
    }
  };

  /**
   * 🎨 RENDERIZADO DEL COMPONENTE (JSX)
   * 
   * Esta es la estructura visual de nuestro formulario de registro.
   * Está organizada en secciones para facilitar el mantenimiento.
   */
  return (
    // 🌟 CONTENEDOR PRINCIPAL CON DISEÑO RESPONSIVO
    // min-h-screen: Altura mínima de toda la pantalla
    // bg-gradient-to-br: Degradado de fondo desde arriba-izquierda a abajo-derecha
    // from-indigo-50 via-white to-purple-50: Colores del degradado (más suave que login)
    // flex items-center justify-center: Centrar contenido vertical y horizontalmente
    // p-4: Padding de 4 unidades en todos los lados para móviles
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      
      {/* 📦 CONTENEDOR DEL FORMULARIO */}
      {/* max-w-md: Ancho máximo mediano (un poco más grande que login) */}
      {/* w-full: Ancho 100% hasta llegar al máximo */}
      <div className="max-w-md w-full">
        
        {/* 🏷️ LOGO Y TÍTULO PRINCIPAL DE LA APLICACIÓN */}
        {/* text-center: Centrar todo el contenido */}
        {/* mb-8: Margen inferior de 8 unidades */}
        <div className="text-center mb-8">
          
          {/* 🎯 CONTENEDOR DEL LOGO */}
          {/* flex justify-center: Centrar el logo horizontalmente */}
          {/* mb-4: Margen inferior de 4 unidades */}
          <div className="flex justify-center mb-4">
            {/* 📚 ICONO PRINCIPAL DE LA APLICACIÓN */}
            {/* w-16 h-16: Tamaño 16x16 (64px) */}
            {/* bg-gradient-to-br: Degradado de fondo */}
            {/* from-indigo-500 to-purple-600: Colores del degradado (más vibrante) */}
            {/* rounded-2xl: Bordes muy redondeados */}
            {/* flex items-center justify-center: Centrar el icono dentro */}
            {/* shadow-lg: Sombra grande para efecto de profundidad */}
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              {/* Icono de BookOpen de Lucide React */}
              {/* w-8 h-8: Tamaño del icono (32px) */}
              {/* text-white: Color blanco */}
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {/* 📝 TÍTULO DE LA APLICACIÓN */}
          {/* text-3xl: Tamaño de texto extra grande */}
          {/* font-bold: Texto en negrita */}
          {/* bg-gradient-to-r: Degradado horizontal para el texto */}
          {/* from-indigo-600 to-purple-600: Colores del degradado */}
          {/* bg-clip-text: Aplicar el degradado solo al texto */}
          {/* text-transparent: Hacer el texto transparente para mostrar el degradado */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AcaLud
          </h1>
          
          {/* 📄 SUBTÍTULO DESCRIPTIVO */}
          {/* text-gray-600: Color gris medio */}
          {/* mt-2: Margen superior de 2 unidades */}
          <p className="text-gray-600 mt-2">Únete a nuestra comunidad educativa</p>
        </div>

        {/* 📋 TARJETA PRINCIPAL DEL FORMULARIO DE REGISTRO */}
        {/* bg-white: Fondo blanco para la tarjeta */}
        {/* rounded-2xl: Bordes muy redondeados para un look moderno */}
        {/* shadow-xl: Sombra extra grande para profundidad */}
        {/* p-8: Padding de 8 unidades en todos los lados */}
        {/* border border-gray-100: Borde sutil gris muy claro */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          
          {/* 📝 TÍTULO DEL FORMULARIO */}
          {/* text-2xl: Tamaño de texto grande */}
          {/* font-bold: Texto en negrita */}
          {/* text-gray-900: Color gris muy oscuro (casi negro) */}
          {/* mb-6: Margen inferior de 6 unidades */}
          {/* text-center: Texto centrado */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Crear Cuenta
          </h2>

          {/* 📝 FORMULARIO PRINCIPAL DE REGISTRO */}
          {/* onSubmit={handleSubmit}: Cuando se envíe el form, ejecutar handleSubmit */}
          {/* space-y-6: Espaciado vertical de 6 unidades entre elementos hijos */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 👤 CAMPO DE NOMBRE COMPLETO */}
            <div>
              {/* Etiqueta del campo nombre */}
              {/* htmlFor: Conecta la etiqueta con el input (accesibilidad) */}
              {/* block: Display block para que ocupe toda la línea */}
              {/* text-sm: Texto pequeño */}
              {/* font-medium: Peso de fuente medio */}
              {/* text-gray-700: Color gris oscuro */}
              {/* mb-2: Margen inferior de 2 unidades */}
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo
              </label>
              
              {/* 🎨 CONTENEDOR DEL INPUT CON ICONO */}
              {/* relative: Posicionamiento relativo para elementos absolutos dentro */}
              <div className="relative">
                
                {/* 👤 ICONO DE USUARIO */}
                {/* absolute: Posicionamiento absoluto */}
                {/* inset-y-0: Top y bottom en 0 (altura completa del input) */}
                {/* left-0: Posición izquierda en 0 */}
                {/* pl-3: Padding izquierdo de 3 */}
                {/* flex items-center: Centrar verticalmente */}
                {/* pointer-events-none: No intercepta clicks (para que lleguen al input) */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {/* Icono de User de Lucide React */}
                  {/* h-5 w-5: Tamaño 5x5 (20px) */}
                  {/* text-gray-400: Color gris claro */}
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* ✍️ INPUT DE NOMBRE */}
                <input
                  id="name"                                           // ID que conecta con la etiqueta
                  name="name"                                         // Nombre del campo (usado en handleInputChange)
                  type="text"                                         // Tipo texto para nombres
                  autoComplete="name"                                 // Permite autocompletado del navegador
                  required                                            // Campo obligatorio
                  value={formData.name}                               // Valor actual del estado
                  onChange={handleInputChange}                       // Al cambiar, actualizar estado
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
                  // transition-colors: Transición suave de colores
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="Tu nombre completo"                   // Texto de ejemplo
                />
              </div>
            </div>

            {/* 📧 CAMPO DE CORREO ELECTRÓNICO */}
            <div>
              {/* Etiqueta del campo email */}
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              
              {/* 🎨 CONTENEDOR DEL INPUT CON ICONO */}
              <div className="relative">
                
                {/* 📮 ICONO DE EMAIL */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {/* Icono de Mail de Lucide React */}
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* ✍️ INPUT DE EMAIL */}
                <input
                  id="email"                                          // ID que conecta con la etiqueta
                  name="email"                                        // Nombre del campo (usado en handleInputChange)
                  type="email"                                        // Tipo email (validación automática del navegador)
                  autoComplete="email"                                // Permite autocompletado del navegador
                  required                                            // Campo obligatorio
                  value={formData.email}                              // Valor actual del estado
                  onChange={handleInputChange}                       // Al cambiar, actualizar estado
                  // Clases similares al campo de nombre pero específicas para email
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="tu@email.com"                          // Texto de ejemplo mostrando formato de email
                />
              </div>
            </div>

            {/* 👥 SELECTOR DE ROL DE USUARIO (CARACTERÍSTICA ÚNICA DEL REGISTRO) */}
            <div>
              {/* Etiqueta del selector de rol */}
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Usuario
              </label>
              
              {/* 🎯 CONTENEDOR DE OPCIONES DE ROL */}
              {/* grid grid-cols-2: Layout de cuadrícula con 2 columnas */}
              {/* gap-3: Espacio de 3 unidades entre elementos */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* 👨‍🎓 OPCIÓN ESTUDIANTE */}
                {/* Usamos template literals (${}) para clases dinámicas según el estado */}
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.role === 'student' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'  // Estilos cuando está seleccionado
                    : 'border-gray-300 hover:border-gray-400'           // Estilos cuando NO está seleccionado
                }`}>
                  {/* Input radio oculto (sr-only = screen reader only) */}
                  <input
                    type="radio"                                        // Tipo radio para selección única
                    name="role"                                         // Nombre del campo (todos los radios deben tener el mismo name)
                    value="student"                                     // Valor que se asigna al seleccionar
                    checked={formData.role === 'student'}               // Está marcado si el estado es 'student'
                    onChange={handleInputChange}                       // Al cambiar, actualizar estado
                    className="sr-only"                                 // Oculto visualmente pero accesible para lectores de pantalla
                  />
                  {/* Icono y texto de la opción */}
                  <User className="w-5 h-5 mr-2" />
                  <span className="font-medium">Estudiante</span>
                </label>
                
                {/* 👨‍🏫 OPCIÓN DOCENTE */}
                <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.role === 'teacher' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'  // Estilos cuando está seleccionado
                    : 'border-gray-300 hover:border-gray-400'           // Estilos cuando NO está seleccionado
                }`}>
                  {/* Input radio oculto */}
                  <input
                    type="radio"                                        // Tipo radio para selección única
                    name="role"                                         // Mismo nombre que el anterior (grupo)
                    value="teacher"                                     // Valor que se asigna al seleccionar
                    checked={formData.role === 'teacher'}               // Está marcado si el estado es 'teacher'
                    onChange={handleInputChange}                       // Al cambiar, actualizar estado
                    className="sr-only"                                 // Oculto visualmente
                  />
                  {/* Icono y texto de la opción docente */}
                  <GraduationCap className="w-5 h-5 mr-2" />
                  <span className="font-medium">Docente</span>
                </label>
              </div> {/* Fin del contenedor de opciones de rol */}
            </div> {/* Fin del selector de rol */}

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
                  name="password"                                      // Nombre del campo (usado en handleInputChange)
                  type={showPassword ? 'text' : 'password'}            // Tipo dinámico: text si está visible, password si está oculta
                  autoComplete="new-password"                          // Indica al navegador que es una contraseña nueva
                  required                                             // Campo obligatorio
                  value={formData.password}                            // Valor actual del estado
                  onChange={handleInputChange}                        // Al cambiar, actualizar estado
                  // Clases similares a otros inputs pero con pr-10 para el botón de mostrar/ocultar
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"                               // Texto de ejemplo (puntos para contraseña)
                />
                
                {/* 👁️ BOTÓN PARA MOSTRAR/OCULTAR CONTRASEÑA */}
                <button
                  type="button"                                        // Tipo button para que no envíe el formulario
                  onClick={() => setShowPassword(!showPassword)}       // Al hacer click, alternar visibilidad
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {/* 👁️ ICONO DINÁMICO SEGÚN ESTADO DE VISIBILIDAD */}
                  {showPassword ? (
                    // Icono de ojo cerrado cuando la contraseña está visible
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    // Icono de ojo abierto cuando la contraseña está oculta
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* 🔒 CAMPO DE CONFIRMAR CONTRASEÑA (ÚNICO DEL REGISTRO) */}
            <div>
              {/* Etiqueta del campo confirmar contraseña */}
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              
              {/* 🎨 CONTENEDOR DEL INPUT CON ICONOS */}
              <div className="relative">
                
                {/* 🔐 ICONO DE CANDADO */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* ✍️ INPUT DE CONFIRMAR CONTRASEÑA */}
                <input
                  id="confirmPassword"                                 // ID que conecta con la etiqueta
                  name="confirmPassword"                               // Nombre del campo (usado en handleInputChange)
                  type={showConfirmPassword ? 'text' : 'password'}     // Tipo dinámico: independiente del campo password
                  autoComplete="new-password"                          // Indica al navegador que es una contraseña nueva
                  required                                             // Campo obligatorio
                  value={formData.confirmPassword}                     // Valor actual del estado
                  onChange={handleInputChange}                        // Al cambiar, actualizar estado
                  // Clases idénticas al campo de contraseña
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"                               // Texto de ejemplo (puntos para contraseña)
                />
                
                {/* 👁️ BOTÓN INDEPENDIENTE PARA MOSTRAR/OCULTAR CONFIRMACIÓN */}
                <button
                  type="button"                                        // Tipo button para que no envíe el formulario
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} // Alternar visibilidad independiente
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {/* 👁️ ICONO DINÁMICO PARA CONFIRMACIÓN DE CONTRASEÑA */}
                  {showConfirmPassword ? (
                    // Icono de ojo cerrado cuando la confirmación está visible
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    // Icono de ojo abierto cuando la confirmación está oculta
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* 🚨 MENSAJE DE ERROR */}
            {/* Solo se muestra si hay un error (renderizado condicional) */}
            {error && (
              // Contenedor del mensaje de error con estilos de alerta roja
              // bg-red-50: Fondo rojo muy claro
              // border border-red-200: Borde rojo claro
              // text-red-700: Texto rojo oscuro
              // px-4 py-3: Padding horizontal 4, vertical 3
              // rounded-lg: Bordes redondeados
              // text-sm: Texto pequeño
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 🚀 BOTÓN DE ENVÍO DEL FORMULARIO DE REGISTRO */}
            <button
              type="submit"                                            // Tipo submit para enviar el formulario
              disabled={isLoading}                                     // Deshabilitado mientras está cargando
              // Clases del botón de registro:
              // w-full: Ancho completo
              // flex justify-center: Flexbox centrado horizontalmente
              // py-3 px-4: Padding vertical 3, horizontal 4
              // border border-transparent: Borde transparente
              // rounded-lg: Bordes redondeados grandes
              // shadow-sm: Sombra pequeña
              // text-sm font-medium: Texto pequeño y peso medio
              // text-white: Texto blanco
              // bg-gradient-to-r: Degradado horizontal (más vistoso que el login)
              // from-indigo-600 to-purple-600: Colores del degradado
              // hover:from-indigo-700 hover:to-purple-700: Degradado más oscuro al hover
              // focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500: Estados de enfoque
              // disabled:opacity-50 disabled:cursor-not-allowed: Estilos cuando está deshabilitado
              // transition-all duration-200: Transición suave de 200ms
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {/* 🔄 CONTENIDO DINÁMICO DEL BOTÓN SEGÚN ESTADO DE CARGA */}
              {isLoading ? (
                // Si está cargando, mostrar spinner y texto de carga
                // flex items-center space-x-2: Layout flexbox con espacio horizontal de 2
                <div className="flex items-center space-x-2">
                  {/* 🌀 SPINNER DE CARGA PARA REGISTRO */}
                  {/* w-4 h-4: Tamaño 4x4 (16px) - más pequeño que en login */}
                  {/* border-2: Borde de 2px */}
                  {/* border-white: Color blanco del borde */}
                  {/* border-t-transparent: Parte superior transparente para crear efecto spinner */}
                  {/* rounded-full: Completamente redondo */}
                  {/* animate-spin: Animación de rotación */}
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creando cuenta...</span>
                </div>
              ) : (
                // Si no está cargando, mostrar texto normal
                'Crear Cuenta'
              )}
            </button>
          </form> {/* 📝 Fin del formulario de registro */}

          {/* 🔄 ENLACE PARA CAMBIAR A LOGIN */}
          {/* mt-6: Margen superior de 6 unidades */}
          {/* text-center: Texto centrado */}
          <div className="mt-6 text-center">
            {/* text-sm: Texto pequeño */}
            {/* text-gray-600: Color gris medio */}
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}  {/* {' '} añade un espacio en JSX */}
              
              {/* 🔗 BOTÓN PARA CAMBIAR A FORMULARIO DE LOGIN */}
              <button
                onClick={onSwitchToLogin}                             // Al hacer click, ejecutar función de cambio
                // font-medium: Peso de fuente medio
                // text-indigo-600: Color azul índigo
                // hover:text-indigo-500: Color más claro al pasar el mouse
                // transition-colors: Transición suave de colores
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Inicia sesión aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 📋 RESUMEN DEL COMPONENTE RegisterForm
 * 
 * Este componente maneja el formulario de registro de nuevos usuarios en AcaLud.
 * 
 * 🎯 CARACTERÍSTICAS PRINCIPALES:
 * - Formulario controlado con React useState
 * - Validación completa de campos (nombre, email, contraseñas)
 * - Verificación de coincidencia de contraseñas
 * - Selección visual de rol (estudiante o profesor)
 * - Integración con AuthContext para registro
 * - Diseño responsivo con Tailwind CSS
 * - Indicadores de carga y manejo de errores
 * - Opción de mostrar/ocultar contraseñas independientes
 * 
 * 🔧 TECNOLOGÍAS UTILIZADAS:
 * - React con TypeScript
 * - Tailwind CSS para styling
 * - Lucide React para iconos
 * - Context API para estado global
 * 
 * 🚀 FUNCIONALIDADES:
 * - Registro con nombre, email, contraseña y rol
 * - Validación de formulario completa
 * - Estados de carga
 * - Manejo de errores específicos
 * - Navegación a login
 * - Selección de tipo de usuario
 * 
 * 💡 PATRONES IMPLEMENTADOS:
 * - Controlled Components
 * - Event Handling
 * - Conditional Rendering
 * - State Management
 * - Form Validation
 * - User Experience Design
 * 
 * 🆚 DIFERENCIAS CON LoginForm:
 * - Campo adicional de nombre
 * - Campo de confirmar contraseña
 * - Selector de rol visual
 * - Validaciones más complejas
 * - Diseño con degradados más vistosos
 */

// 📤 EXPORTACIÓN DEL COMPONENTE
// export default: Exportación por defecto para que pueda ser importado como RegisterForm
export default RegisterForm;