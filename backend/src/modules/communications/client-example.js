/**
 * 🌐 CLIENTE WEBSOCKET EJEMPLO - DEMOSTRACIÓN DE USO
 * 
 * Ejemplo completo de cómo conectarse y usar el gateway WebSocket
 * de comunicaciones desde el frontend.
 * 
 * FUNCIONALIDADES DEMOSTRADAS:
 * - Conexión autenticada con JWT
 * - Unirse a conversaciones
 * - Enviar mensajes en tiempo real
 * - Escuchar eventos de otros usuarios
 * - Indicadores de typing
 * - Reacciones a mensajes
 * - Manejo de errores y reconexión
 */

// 📦 Importar socket.io-client en tu proyecto frontend:
// npm install socket.io-client

// En un proyecto React/Vue/Angular:
// import { io } from 'socket.io-client';

// En HTML vanilla:
// <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>

/**
 * Configuración del cliente WebSocket
 */
const WEBSOCKET_CONFIG = {
  url: 'ws://localhost:3000/communications', // URL del backend
  options: {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true,
  }
};

/**
 * Clase principal del cliente WebSocket
 */
class CommunicationsWebSocketClient {
  constructor(jwtToken) {
    this.token = jwtToken;
    this.socket = null;
    this.currentConversation = null;
    this.isConnected = false;
    
    // 📊 Estado del cliente
    this.connectedUsers = new Set();
    this.typingUsers = new Map(); // conversationId -> Set<userId>
    
    this.init();
  }

  /**
   * 🚀 Inicializar conexión WebSocket
   */
  init() {
    console.log('🔌 Conectando a WebSocket...');
    
    this.socket = io(WEBSOCKET_CONFIG.url, {
      ...WEBSOCKET_CONFIG.options,
      auth: {
        token: this.token
      }
    });

    this.setupEventListeners();
  }

  /**
   * 📡 Configurar event listeners
   */
  setupEventListeners() {
    // ===== EVENTOS DE CONEXIÓN =====
    
    this.socket.on('connect', () => {
      console.log('✅ Conectado al WebSocket');
      this.isConnected = true;
      this.onConnectionStateChange(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del WebSocket:', reason);
      this.isConnected = false;
      this.onConnectionStateChange(false);
    });

    this.socket.on('connection_established', (response) => {
      console.log('🎉 Conexión establecida:', response);
      this.onConnectionEstablished(response.data);
    });

    // ===== EVENTOS DE CONVERSACIONES =====
    
    this.socket.on('user_joined_conversation', (data) => {
      console.log('👥 Usuario se unió a conversación:', data);
      this.onUserJoinedConversation(data);
    });

    this.socket.on('user_left_conversation', (data) => {
      console.log('👋 Usuario abandonó conversación:', data);
      this.onUserLeftConversation(data);
    });

    // ===== EVENTOS DE MENSAJES =====
    
    this.socket.on('new_message', (message) => {
      console.log('💌 Nuevo mensaje:', message);
      this.onNewMessage(message);
    });

    // ===== EVENTOS DE TYPING =====
    
    this.socket.on('user_typing', (data) => {
      console.log('⌨️ Usuario escribiendo:', data);
      this.onUserTyping(data);
    });

    // ===== EVENTOS DE REACCIONES =====
    
    this.socket.on('reaction_added', (data) => {
      console.log('👍 Reacción agregada:', data);
      this.onReactionAdded(data);
    });

    this.socket.on('reaction_removed', (data) => {
      console.log('🗑️ Reacción eliminada:', data);
      this.onReactionRemoved(data);
    });

    // ===== EVENTOS DE PRESENCIA =====
    
    this.socket.on('user_presence_changed', (data) => {
      console.log('🌍 Cambio de presencia:', data);
      this.onUserPresenceChanged(data);
    });

    // ===== EVENTOS DE ERROR =====
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
      this.onConnectionError(error);
    });
  }

  // =============================================================================
  // 📤 MÉTODOS PARA ENVIAR EVENTOS
  // =============================================================================

  /**
   * 🚪 Unirse a una conversación
   * 
   * @param {string} conversationId - ID de la conversación
   */
  async joinConversation(conversationId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join_conversation', { conversationId }, (response) => {
        if (response.success) {
          this.currentConversation = conversationId;
          console.log('✅ Unido a conversación:', conversationId);
          resolve(response.data);
        } else {
          console.error('❌ Error uniéndose a conversación:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * 🚪 Abandonar conversación actual
   */
  async leaveConversation() {
    if (!this.currentConversation) {
      console.warn('⚠️ No hay conversación activa');
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('leave_conversation', 
        { conversationId: this.currentConversation }, 
        (response) => {
          if (response.success) {
            console.log('✅ Abandonó conversación:', this.currentConversation);
            this.currentConversation = null;
            resolve(response.data);
          } else {
            console.error('❌ Error abandonando conversación:', response.error);
            reject(new Error(response.error));
          }
        }
      );
    });
  }

  /**
   * 💌 Enviar mensaje
   * 
   * @param {string} content - Contenido del mensaje
   * @param {string} type - Tipo de mensaje (opcional)
   * @param {string} parentMessageId - ID del mensaje padre (opcional)
   */
  async sendMessage(content, type = 'text', parentMessageId = null) {
    if (!this.currentConversation) {
      throw new Error('No hay conversación activa');
    }

    return new Promise((resolve, reject) => {
      const messageData = {
        conversationId: this.currentConversation,
        content,
        type,
        parentMessageId,
        metadata: {
          clientTimestamp: new Date().toISOString()
        }
      };

      this.socket.emit('send_message', messageData, (response) => {
        if (response.success) {
          console.log('✅ Mensaje enviado:', response.data);
          resolve(response.data);
        } else {
          console.error('❌ Error enviando mensaje:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * ⌨️ Indicar que estoy escribiendo
   */
  startTyping() {
    if (!this.currentConversation) return;

    this.socket.emit('typing_start', {
      conversationId: this.currentConversation
    });
  }

  /**
   * ⌨️ Indicar que dejé de escribir
   */
  stopTyping() {
    if (!this.currentConversation) return;

    this.socket.emit('typing_stop', {
      conversationId: this.currentConversation
    });
  }

  /**
   * 👍 Agregar reacción a un mensaje
   * 
   * @param {string} messageId - ID del mensaje
   * @param {string} reactionType - Tipo de reacción
   */
  async addReaction(messageId, reactionType) {
    if (!this.currentConversation) {
      throw new Error('No hay conversación activa');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('add_reaction', {
        messageId,
        conversationId: this.currentConversation,
        reactionType
      }, (response) => {
        if (response.success) {
          console.log('✅ Reacción agregada:', response.data);
          resolve(response.data);
        } else {
          console.error('❌ Error agregando reacción:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * 🗑️ Eliminar reacción de un mensaje
   * 
   * @param {string} messageId - ID del mensaje
   * @param {string} reactionType - Tipo de reacción
   */
  async removeReaction(messageId, reactionType) {
    if (!this.currentConversation) {
      throw new Error('No hay conversación activa');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('remove_reaction', {
        messageId,
        conversationId: this.currentConversation,
        reactionType
      }, (response) => {
        if (response.success) {
          console.log('✅ Reacción eliminada:', response.data);
          resolve(response.data);
        } else {
          console.error('❌ Error eliminando reacción:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }

  // =============================================================================
  // 📨 HANDLERS DE EVENTOS (PARA SOBRESCRIBIR)
  // =============================================================================

  onConnectionStateChange(isConnected) {
    // Sobrescribir en tu aplicación
    console.log(`🔌 Estado de conexión: ${isConnected ? 'Conectado' : 'Desconectado'}`);
  }

  onConnectionEstablished(userData) {
    // Sobrescribir en tu aplicación
    console.log('🎉 Sesión establecida para:', userData);
  }

  onNewMessage(message) {
    // Sobrescribir en tu aplicación para mostrar el mensaje en la UI
    console.log('💌 Mostrar nuevo mensaje:', message);
  }

  onUserJoinedConversation(data) {
    // Sobrescribir para actualizar lista de participantes
    console.log('👥 Usuario se unió:', data.userName);
  }

  onUserLeftConversation(data) {
    // Sobrescribir para actualizar lista de participantes
    console.log('👋 Usuario se fue:', data.userName);
  }

  onUserTyping(data) {
    // Sobrescribir para mostrar indicador de typing
    if (data.isTyping) {
      console.log(`⌨️ ${data.userName} está escribiendo...`);
    } else {
      console.log(`⌨️ ${data.userName} dejó de escribir`);
    }
  }

  onReactionAdded(data) {
    // Sobrescribir para mostrar reacción en UI
    console.log(`👍 ${data.reaction.userName} reaccionó con ${data.reaction.emoji}`);
  }

  onReactionRemoved(data) {
    // Sobrescribir para quitar reacción de UI
    console.log(`🗑️ ${data.userName} quitó su reacción`);
  }

  onUserPresenceChanged(data) {
    // Sobrescribir para actualizar estado de presencia
    if (data.isOnline) {
      this.connectedUsers.add(data.userId);
    } else {
      this.connectedUsers.delete(data.userId);
    }
  }

  onConnectionError(error) {
    // Sobrescribir para manejo de errores
    console.error('❌ Error de conexión:', error);
  }

  // =============================================================================
  // 🔧 MÉTODOS DE UTILIDAD
  // =============================================================================

  /**
   * 🔌 Desconectar del WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * 🔄 Reconectar al WebSocket
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  /**
   * 📊 Obtener estado de la conexión
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      currentConversation: this.currentConversation,
      connectedUsers: Array.from(this.connectedUsers),
      socketId: this.socket?.id,
    };
  }
}

// =============================================================================
// 📝 EJEMPLO DE USO
// =============================================================================

/*
// 1. Crear instancia del cliente
const jwtToken = 'your-jwt-token-here';
const wsClient = new CommunicationsWebSocketClient(jwtToken);

// 2. Personalizar handlers
wsClient.onNewMessage = (message) => {
  // Mostrar mensaje en tu UI
  displayMessage(message);
};

wsClient.onUserTyping = (data) => {
  // Mostrar/ocultar indicador de typing
  updateTypingIndicator(data);
};

// 3. Usar el cliente
async function startChat() {
  try {
    // Unirse a una conversación
    await wsClient.joinConversation('550e8400-e29b-41d4-a716-446655440000');
    
    // Enviar mensaje
    await wsClient.sendMessage('¡Hola a todos!');
    
    // Agregar reacción
    await wsClient.addReaction('message-id', 'like');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// 4. Implementar typing indicator
let typingTimer;
document.getElementById('messageInput').addEventListener('input', () => {
  wsClient.startTyping();
  
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    wsClient.stopTyping();
  }, 1000);
});
*/

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommunicationsWebSocketClient;
}