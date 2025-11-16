/**
 * 🌐 EJEMPLOS DE USO - API REST Y WEBSOCKET
 * 
 * Ejemplos completos de cómo usar todos los endpoints del sistema
 * de comunicaciones tanto para REST API como WebSocket.
 * 
 * CONFIGURACIÓN INICIAL:
 * - Servidor corriendo en: http://localhost:3000
 * - WebSocket en: ws://localhost:3000/communications
 * - Autenticación: Bearer Token JWT requerido
 * 
 * HERRAMIENTAS RECOMENDADAS:
* - Cliente HTTP (Thunder Client, REST Client)
 * - Socket.IO Client (WebSocket)
 * - Thunder Client (VS Code Extension)
 */

// =============================================================================
// 📚 TABLA DE CONTENIDOS
// =============================================================================
/*
1. 🔧 CONFIGURACIÓN INICIAL
2. 👤 AUTENTICACIÓN
3. 💬 GESTIÓN DE CONVERSACIONES
4. 💌 GESTIÓN DE MENSAJES
5. 👍 SISTEMA DE REACCIONES
6. 📎 ARCHIVOS ADJUNTOS
7. 🌐 WEBSOCKET EN TIEMPO REAL
8. 🧪 TESTING CON HERRAMIENTAS
9. 🐛 TROUBLESHOOTING
10. 📊 MONITOREO Y MÉTRICAS
*/

// =============================================================================
// 🔧 1. CONFIGURACIÓN INICIAL
// =============================================================================

/**
 * 🏗️ Variables de configuración
 */
const CONFIG = {
  baseURL: 'http://localhost:3000/communications',
  wsURL: 'ws://localhost:3000/communications',
  timeout: 10000,
  retries: 3,
};

/**
 * 🔑 Headers base para todas las peticiones
 */
const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // 🔄 Reemplazar con token real
};

// =============================================================================
// 👤 2. AUTENTICACIÓN
// =============================================================================

/**
 * 🔐 Ejemplo de obtener JWT Token (desde tu sistema de auth)
 */
const authExample = {
  // POST /auth/login
  request: {
    method: 'POST',
    url: 'http://localhost:3000/auth/login',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: 'usuario@ejemplo.com',
      password: 'mi-contraseña-segura'
    }
  },
  response: {
    success: true,
    data: {
      user: { id: 'user-id', name: 'Usuario', email: 'usuario@ejemplo.com' },
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'refresh-token-here'
    }
  }
};

// =============================================================================
// 💬 3. GESTIÓN DE CONVERSACIONES
// =============================================================================

/**
 * ➕ 3.1 CREAR CONVERSACIÓN
 */
const createConversationExample = {
  method: 'POST',
  url: `${CONFIG.baseURL}/conversations`,
  headers: BASE_HEADERS,
  body: {
    title: 'Proyecto Final - Grupo A',
    description: 'Conversación para coordinar el desarrollo del proyecto final de la materia',
    type: 'group', // 'direct' | 'group' | 'announcement'
    participantIds: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003'
    ],
    metadata: {
      subject: 'Desarrollo de Software',
      priority: 'high',
      isPublic: false
    }
  },
  expectedResponse: {
    success: true,
    message: 'Conversación creada exitosamente',
    data: {
      id: '660e8400-e29b-41d4-a716-446655440000',
      title: 'Proyecto Final - Grupo A',
      description: 'Conversación para coordinar el desarrollo del proyecto final de la materia',
      type: 'group',
      createdBy: 'user-id',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      isActive: true,
      participantCount: 3,
      messageCount: 0
    }
  }
};

/**
 * 📋 3.2 LISTAR CONVERSACIONES DEL USUARIO
 */
const getConversationsExample = {
  method: 'GET',
  url: `${CONFIG.baseURL}/conversations?page=1&limit=10&type=group`,
  headers: BASE_HEADERS,
  expectedResponse: {
    success: true,
    message: 'Conversaciones obtenidas exitosamente',
    data: {
      conversations: [
        {
          id: '660e8400-e29b-41d4-a716-446655440000',
          title: 'Proyecto Final - Grupo A',
          type: 'group',
          lastMessage: {
            content: 'Último mensaje de la conversación',
            createdAt: '2024-01-15T15:45:00Z',
            sender: { name: 'Juan Pérez' }
          },
          unreadCount: 3,
          participantCount: 4
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    }
  }
};

/**
 * 🔍 3.3 OBTENER DETALLES DE CONVERSACIÓN
 */
const getConversationDetailsExample = {
  method: 'GET',
  url: `${CONFIG.baseURL}/conversations/660e8400-e29b-41d4-a716-446655440000`,
  headers: BASE_HEADERS,
  expectedResponse: {
    success: true,
    message: 'Detalles de conversación obtenidos exitosamente',
    data: {
      id: '660e8400-e29b-41d4-a716-446655440000',
      title: 'Proyecto Final - Grupo A',
      description: 'Conversación para coordinar el desarrollo del proyecto final de la materia',
      type: 'group',
      participants: [
        {
          id: 'user-1',
          name: 'Juan Pérez',
          email: 'juan@ejemplo.com',
          role: 'student',
          isOnline: true,
          lastSeen: '2024-01-15T16:00:00Z'
        }
      ],
      messageCount: 25,
      createdAt: '2024-01-15T10:30:00Z'
    }
  }
};

/**
 * ✏️ 3.4 ACTUALIZAR CONVERSACIÓN
 */
const updateConversationExample = {
  method: 'PUT',
  url: `${CONFIG.baseURL}/conversations/660e8400-e29b-41d4-a716-446655440000`,
  headers: BASE_HEADERS,
  body: {
    title: 'Proyecto Final - Grupo A (Actualizado)',
    description: 'Descripción actualizada de la conversación',
    metadata: {
      subject: 'Desarrollo de Software',
      priority: 'medium',
      deadline: '2024-02-01T23:59:59Z'
    }
  }
};

/**
 * 👥 3.5 AGREGAR PARTICIPANTE
 */
const addParticipantExample = {
  method: 'POST',
  url: `${CONFIG.baseURL}/conversations/660e8400-e29b-41d4-a716-446655440000/participants`,
  headers: BASE_HEADERS,
  body: {
    userId: '550e8400-e29b-41d4-a716-446655440004',
    role: 'participant' // 'admin' | 'participant' | 'readonly'
  }
};

// =============================================================================
// 💌 4. GESTIÓN DE MENSAJES
// =============================================================================

/**
 * 📤 4.1 ENVIAR MENSAJE
 */
const sendMessageExample = {
  method: 'POST',
  url: `${CONFIG.baseURL}/conversations/660e8400-e29b-41d4-a716-446655440000/messages`,
  headers: BASE_HEADERS,
  body: {
    content: '¡Hola equipo! ¿Cómo van con sus tareas asignadas? 🚀',
    type: 'text', // 'text' | 'image' | 'file' | 'link' | 'code'
    parentMessageId: null, // Para responder a un mensaje específico
    metadata: {
      mentions: ['@juan', '@maria'],
      priority: 'normal',
      clientTimestamp: new Date().toISOString()
    }
  },
  expectedResponse: {
    success: true,
    message: 'Mensaje enviado exitosamente',
    data: {
      id: '770e8400-e29b-41d4-a716-446655440000',
      content: '¡Hola equipo! ¿Cómo van con sus tareas asignadas? 🚀',
      type: 'text',
      senderId: 'user-id',
      conversationId: '660e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-15T16:30:00Z',
      isEdited: false,
      reactionCount: {
        like: 0,
        love: 0,
        laugh: 0
      }
    }
  }
};

/**
 * 📋 4.2 LISTAR MENSAJES DE CONVERSACIÓN
 */
const getMessagesExample = {
  method: 'GET',
  url: `${CONFIG.baseURL}/conversations/660e8400-e29b-41d4-a716-446655440000/messages?page=1&limit=20&order=DESC`,
  headers: BASE_HEADERS,
  expectedResponse: {
    success: true,
    message: 'Mensajes obtenidos exitosamente',
    data: {
      messages: [
        {
          id: '770e8400-e29b-41d4-a716-446655440000',
          content: '¡Hola equipo! ¿Cómo van con sus tareas asignadas? 🚀',
          type: 'text',
          sender: {
            id: 'user-id',
            name: 'Juan Pérez',
            avatar: 'https://ejemplo.com/avatar.jpg'
          },
          createdAt: '2024-01-15T16:30:00Z',
          reactions: [
            {
              id: 'reaction-id',
              type: 'like',
              emoji: '👍',
              count: 2,
              userReacted: true
            }
          ],
          attachments: []
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false
      }
    }
  }
};

/**
 * ✏️ 4.3 EDITAR MENSAJE
 */
const editMessageExample = {
  method: 'PUT',
  url: `${CONFIG.baseURL}/messages/770e8400-e29b-41d4-a716-446655440000`,
  headers: BASE_HEADERS,
  body: {
    content: '¡Hola equipo! ¿Cómo van con sus tareas asignadas? (Mensaje editado) ✏️',
    metadata: {
      editReason: 'Corrección de typo',
      editedAt: new Date().toISOString()
    }
  }
};

/**
 * 🗑️ 4.4 ELIMINAR MENSAJE
 */
const deleteMessageExample = {
  method: 'DELETE',
  url: `${CONFIG.baseURL}/messages/770e8400-e29b-41d4-a716-446655440000`,
  headers: BASE_HEADERS,
  expectedResponse: {
    success: true,
    message: 'Mensaje eliminado exitosamente',
    data: {
      id: '770e8400-e29b-41d4-a716-446655440000',
      isDeleted: true,
      deletedAt: '2024-01-15T17:00:00Z'
    }
  }
};

// =============================================================================
// 👍 5. SISTEMA DE REACCIONES
// =============================================================================

/**
 * ➕ 5.1 AGREGAR REACCIÓN
 */
const addReactionExample = {
  method: 'POST',
  url: `${CONFIG.baseURL}/messages/770e8400-e29b-41d4-a716-446655440000/reactions`,
  headers: BASE_HEADERS,
  body: {
    reactionType: 'like', // 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
    emoji: '👍'
  },
  expectedResponse: {
    success: true,
    message: 'Reacción agregada exitosamente',
    data: {
      id: '880e8400-e29b-41d4-a716-446655440000',
      messageId: '770e8400-e29b-41d4-a716-446655440000',
      userId: 'user-id',
      reactionType: 'like',
      emoji: '👍',
      createdAt: '2024-01-15T16:35:00Z'
    }
  }
};

/**
 * ➖ 5.2 ELIMINAR REACCIÓN
 */
const removeReactionExample = {
  method: 'DELETE',
  url: `${CONFIG.baseURL}/messages/770e8400-e29b-41d4-a716-446655440000/reactions?reactionType=like`,
  headers: BASE_HEADERS,
  expectedResponse: {
    success: true,
    message: 'Reacción eliminada exitosamente',
    data: {
      messageId: '770e8400-e29b-41d4-a716-446655440000',
      reactionType: 'like',
      removedAt: '2024-01-15T16:40:00Z'
    }
  }
};

// =============================================================================
// 📎 6. ARCHIVOS ADJUNTOS
// =============================================================================

/**
 * 📤 6.1 SUBIR ARCHIVO ADJUNTO
 */
const uploadAttachmentExample = {
  method: 'POST',
  url: `${CONFIG.baseURL}/messages/770e8400-e29b-41d4-a716-446655440000/attachments`,
  // Nota: Para archivos usar FormData
  headers: {
    'Authorization': BASE_HEADERS.Authorization,
    // NO incluir Content-Type para FormData
  },
  // En JavaScript real:
  // const formData = new FormData();
  // formData.append('file', fileInput.files[0]);
  // formData.append('description', 'Documento importante');
  bodyDescription: `
    FormData con:
    - file: [File object]
    - description: "Documento del proyecto - Especificaciones técnicas"
    - metadata: JSON.stringify({ category: 'document', isPublic: false })
  `,
  expectedResponse: {
    success: true,
    message: 'Archivo subido exitosamente',
    data: {
      id: '990e8400-e29b-41d4-a716-446655440000',
      filename: 'especificaciones-tecnicas.pdf',
      originalName: 'Especificaciones Técnicas del Proyecto.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048576, // bytes
      downloadUrl: `/communications/attachments/990e8400-e29b-41d4-a716-446655440000/download`,
      uploadedAt: '2024-01-15T16:45:00Z'
    }
  }
};

/**
 * 📥 6.2 DESCARGAR ARCHIVO
 */
const downloadAttachmentExample = {
  method: 'GET',
  url: `${CONFIG.baseURL}/attachments/990e8400-e29b-41d4-a716-446655440000/download`,
  headers: { 'Authorization': BASE_HEADERS.Authorization },
  responseType: 'blob', // Para archivos binarios
  description: 'Retorna el archivo binario con headers apropiados para descarga'
};

// =============================================================================
// 🌐 7. WEBSOCKET EN TIEMPO REAL
// =============================================================================

/**
 * 🔌 7.1 CONEXIÓN INICIAL
 */
const websocketConnectionExample = `
// JavaScript (cliente)
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/communications', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});

// Eventos de conexión
socket.on('connect', () => {
  console.log('✅ Conectado al WebSocket:', socket.id);
});

socket.on('connection_established', (data) => {
  console.log('🎉 Sesión establecida:', data);
  // data = { user: {...}, timestamp: '...', socketId: '...' }
});

socket.on('disconnect', (reason) => {
  console.log('❌ Desconectado:', reason);
});
`;

/**
 * 🚪 7.2 UNIRSE A CONVERSACIÓN
 */
const websocketJoinExample = `
// Unirse a una conversación específica
socket.emit('join_conversation', {
  conversationId: '660e8400-e29b-41d4-a716-446655440000'
}, (response) => {
  if (response.success) {
    console.log('✅ Unido a conversación:', response.data);
  } else {
    console.error('❌ Error:', response.error);
  }
});

// Escuchar cuando otros usuarios se unen
socket.on('user_joined_conversation', (data) => {
  console.log('👥 Usuario se unió:', data);
  // data = { userId: '...', userName: '...', conversationId: '...', timestamp: '...' }
});
`;

/**
 * 💬 7.3 ENVIAR Y RECIBIR MENSAJES
 */
const websocketMessagesExample = `
// Enviar mensaje en tiempo real
socket.emit('send_message', {
  conversationId: '660e8400-e29b-41d4-a716-446655440000',
  content: '¡Mensaje en tiempo real! 🚀',
  type: 'text',
  metadata: { 
    clientTimestamp: new Date().toISOString() 
  }
}, (response) => {
  if (response.success) {
    console.log('✅ Mensaje enviado:', response.data);
  }
});

// Recibir mensajes de otros usuarios
socket.on('new_message', (message) => {
  console.log('💌 Nuevo mensaje recibido:', message);
  // Actualizar UI con el nuevo mensaje
  displayMessage(message);
});
`;

/**
 * ⌨️ 7.4 INDICADORES DE TYPING
 */
const websocketTypingExample = `
// Indicar que estoy escribiendo
let typingTimer;
const messageInput = document.getElementById('message-input');

messageInput.addEventListener('input', () => {
  // Notificar que estoy escribiendo
  socket.emit('typing_start', {
    conversationId: '660e8400-e29b-41d4-a716-446655440000'
  });
  
  // Limpiar timer anterior
  clearTimeout(typingTimer);
  
  // Dejar de escribir después de 1 segundo de inactividad
  typingTimer = setTimeout(() => {
    socket.emit('typing_stop', {
      conversationId: '660e8400-e29b-41d4-a716-446655440000'
    });
  }, 1000);
});

// Escuchar cuando otros usuarios escriben
socket.on('user_typing', (data) => {
  if (data.isTyping) {
    showTypingIndicator(data.userId, data.userName);
  } else {
    hideTypingIndicator(data.userId);
  }
});
`;

/**
 * 👍 7.5 REACCIONES EN TIEMPO REAL
 */
const websocketReactionsExample = `
// Agregar reacción
socket.emit('add_reaction', {
  messageId: '770e8400-e29b-41d4-a716-446655440000',
  conversationId: '660e8400-e29b-41d4-a716-446655440000',
  reactionType: 'like',
  emoji: '👍'
}, (response) => {
  console.log('Reacción agregada:', response);
});

// Escuchar reacciones de otros usuarios
socket.on('reaction_added', (data) => {
  console.log('👍 Nueva reacción:', data);
  updateMessageReactions(data.messageId, data.reaction);
});

socket.on('reaction_removed', (data) => {
  console.log('🗑️ Reacción eliminada:', data);
  removeMessageReaction(data.messageId, data.reactionType, data.userId);
});
`;

// =============================================================================
// 🧪 8. TESTING CON HERRAMIENTAS
// =============================================================================

/**
 *  8.2 CURL COMMANDS
 */
const curlExamples = {
  createConversation: `
curl -X POST http://localhost:3000/communications/conversations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "title": "Test Conversation",
    "description": "Testing with curl",
    "type": "group",
    "participantIds": ["user-id-1", "user-id-2"]
  }'
`,
  
  sendMessage: `
curl -X POST http://localhost:3000/communications/conversations/CONVERSATION_ID/messages \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "content": "Hello from curl!",
    "type": "text"
  }'
`,
  
  uploadFile: `
curl -X POST http://localhost:3000/communications/messages/MESSAGE_ID/attachments \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "file=@/path/to/your/file.pdf" \\
  -F "description=Uploaded via curl"
`
};

// =============================================================================
// 🐛 9. TROUBLESHOOTING
// =============================================================================

/**
 * ❌ 9.1 ERRORES COMUNES Y SOLUCIONES
 */
const commonErrors = {
  unauthorized: {
    error: {
      status: 401,
      message: 'Unauthorized - Token inválido o expirado'
    },
    solution: `
      1. Verificar que el token JWT esté incluido en el header Authorization
      2. Confirmar formato: "Bearer your-token-here"
      3. Verificar que el token no haya expirado
      4. Validar que el usuario tenga permisos necesarios
    `
  },
  
  conversationNotFound: {
    error: {
      status: 404,
      message: 'Conversación no encontrada'
    },
    solution: `
      1. Verificar que el ID de conversación sea válido
      2. Confirmar que el usuario tenga acceso a la conversación
      3. Verificar que la conversación no haya sido eliminada
    `
  },
  
  websocketConnection: {
    error: 'Error de conexión WebSocket',
    solution: `
      1. Verificar que el servidor esté corriendo
      2. Confirmar que el token JWT sea válido en el auth object
      3. Verificar firewall y puertos abiertos
      4. Comprobar configuración CORS del servidor
    `
  },
  
  fileUpload: {
    error: 'Error al subir archivo',
    solution: `
      1. Verificar tamaño de archivo (límite configurado en servidor)
      2. Confirmar tipo de archivo permitido
      3. Usar FormData correctamente
      4. Verificar permisos de escritura en servidor
    `
  }
};

/**
 * 🔧 9.2 DEBUGGING TIPS
 */
const debuggingTips = `
1. 📊 LOGS DEL SERVIDOR:
   - Verificar logs en consola del backend
   - Revisar nivel de log configurado
   - Buscar stack traces de errores

2. 🌐 NETWORK TAB:
   - Abrir DevTools > Network
   - Verificar status codes de respuestas
   - Revisar headers de request/response

3. 🔌 WEBSOCKET DEBUGGING:
   - DevTools > Network > WS tab
   - Socket.IO client debug: localStorage.debug = 'socket.io-client:socket'
   - Verificar eventos enviados/recibidos

4. 🔍 CLIENTE HTTP DEBUGGING:
  - Usar scripts de validación del cliente (Thunder Client Tests, REST Client hooks)
  - Verificar variables y pre-scripts configurados
  - Revisar la consola/registro del cliente para errores de request
`;

// =============================================================================
// 📊 10. MONITOREO Y MÉTRICAS
// =============================================================================

/**
 * 📈 10.1 HEALTHCHECK ENDPOINT
 */
const healthCheckExample = {
  method: 'GET',
  url: 'http://localhost:3000/health',
  expectedResponse: {
    status: 'ok',
    timestamp: '2024-01-15T17:00:00Z',
    uptime: 3600,
    database: 'connected',
    websocket: 'active',
    version: '1.0.0'
  }
};

/**
 * 📊 10.2 MÉTRICAS DE SISTEMA
 */
const systemMetrics = {
  endpoint: 'GET /metrics',
  metrics: [
    'communications_messages_total',
    'communications_conversations_active',
    'communications_websocket_connections',
    'communications_api_requests_duration',
    'communications_errors_total'
  ]
};

// =============================================================================
// 🎯 CONCLUSIÓN Y PRÓXIMOS PASOS
// =============================================================================

/**
 * ✅ CHECKLIST DE IMPLEMENTACIÓN
 */
const implementationChecklist = `
□ 1. Configurar variables de entorno
□ 2. Instalar dependencias WebSocket
□ 3. Configurar base de datos y migraciones
□ 4. Implementar autenticación JWT
□ 5. Crear y probar endpoints REST
□ 6. Implementar WebSocket Gateway
□ 7. Configurar CORS y seguridad
□ 8. Implementar sistema de archivos
□ 9. Crear tests unitarios e integración
□ 10. Configurar monitoreo y logs
□ 11. Documentar API con Swagger
□ 12. Deploy y configuración de producción
`;

/**
 * 🚀 PRÓXIMAS FUNCIONALIDADES
 */
const futureFeatures = `
🔮 ROADMAP DE MEJORAS:

1. 🔔 NOTIFICACIONES PUSH
   - Notificaciones móviles
   - Email notifications
   - Desktop notifications

2. 🎥 MULTIMEDIA AVANZADO
   - Mensajes de voz
   - Videollamadas integradas
   - Compartir pantalla

3. 🔐 SEGURIDAD AVANZADA
   - Cifrado end-to-end
   - Autenticación 2FA
   - Audit logs completos

4. 🤖 INTELIGENCIA ARTIFICIAL
   - Chatbots automáticos
   - Traducción automática
   - Resumen de conversaciones

5. 📊 ANALYTICS AVANZADOS
   - Métricas de engagement
   - Reportes de uso
   - Dashboard administrativo
`;

export {
  CONFIG,
  BASE_HEADERS,
  authExample,
  createConversationExample,
  getConversationsExample,
  sendMessageExample,
  addReactionExample,
  uploadAttachmentExample,
  websocketConnectionExample,
  commonErrors,
  debuggingTips,
  implementationChecklist,
  futureFeatures
};

/**
 * 🎉 MENSAJE FINAL
 * 
 * ¡Felicitaciones! Has completado la implementación del sistema de
 * comunicaciones más completo para tu plataforma educativa.
 * 
 * Este sistema incluye:
 * ✅ REST API completa con 15 endpoints
 * ✅ WebSocket Gateway para tiempo real
 * ✅ Autenticación JWT robusta
 * ✅ Sistema de archivos adjuntos
 * ✅ Reacciones y emojis
 * ✅ Indicadores de typing
 * ✅ Documentación técnica completa
 * ✅ Ejemplos de uso y testing
 * 
 * 🚀 ¡Tu plataforma ahora tiene capacidades de comunicación
 * de nivel empresarial!
 */