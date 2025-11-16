# 📡 SISTEMA DE COMUNICACIONES - DOCUMENTACIÓN TÉCNICA

## 🎯 Resumen Ejecutivo

El sistema de comunicaciones es una solución completa de chat en tiempo real implementada con NestJS, TypeORM, Socket.IO y siguiendo principios SOLID. Proporciona tanto API REST como WebSocket para una experiencia de usuario fluida y en tiempo real.

### 🚀 Características Principales

- ✅ **Chat en Tiempo Real**: Mensajes instantáneos con WebSocket
- ✅ **Autenticación JWT**: Seguridad para REST y WebSocket
- ✅ **Indicadores de Typing**: Visualización cuando usuarios escriben
- ✅ **Reacciones a Mensajes**: Sistema completo de emojis/reacciones
- ✅ **Gestión de Archivos**: Adjuntos en mensajes con validación
- ✅ **Presencia de Usuarios**: Estado online/offline en tiempo real
- ✅ **Conversaciones Grupales**: Soporte para múltiples participantes
- ✅ **Jerarquía de Mensajes**: Respuestas y hilos de conversación
- ✅ **Validación Completa**: DTOs con validación robusta
- ✅ **Documentación Swagger**: API completamente documentada
- ✅ **Manejo de Errores**: Sistema robusto de manejo de excepciones

---

## 🏗️ Arquitectura del Sistema

### 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND CLIENTS                         │
│              (React, Vue, Angular, etc.)                    │
└─────────────────┬─────────────────┬─────────────────────────┘
                  │                 │
              REST API          WebSocket
                  │                 │
┌─────────────────▼─────────────────▼─────────────────────────┐
│                 COMMUNICATIONS MODULE                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Controller    │    Gateway      │       Service           │
│   (REST API)    │  (WebSocket)    │   (Business Logic)     │
└─────────────────┼─────────────────┼─────────────────────────┘
                  │                 │
┌─────────────────▼─────────────────▼─────────────────────────┐
│                      DATABASE LAYER                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │Conversation │ │   Message   │ │   MessageReaction   │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MessageAttachment                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 🧩 Componentes del Sistema

#### 1. **Entidades de Datos** (`entities/`)
- **Conversation**: Gestiona conversaciones/chats
- **Message**: Maneja mensajes individuales
- **MessageReaction**: Sistema de reacciones/emojis
- **MessageAttachment**: Archivos adjuntos

#### 2. **Controlador REST** (`communications.controller.ts`)
- 15 endpoints REST completos
- Documentación Swagger integrada
- Validación con DTOs
- Manejo robusto de errores

#### 3. **Gateway WebSocket** (`communications.gateway.ts`)
- Conexiones en tiempo real
- Autenticación JWT para WebSocket
- Eventos bidireccionales
- Manejo de salas/rooms

#### 4. **Servicio de Negocio** (`communications.service.ts`)
- Lógica de negocio completa
- Integración con base de datos
- Validaciones avanzadas
- Gestión de archivos

---

## 🌐 API REST - Endpoints

### 🔒 Autenticación
Todos los endpoints requieren Bearer Token JWT en el header:
```
Authorization: Bearer <jwt-token>
```

### 📋 Lista Completa de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/conversations` | Listar conversaciones del usuario |
| `POST` | `/conversations` | Crear nueva conversación |
| `GET` | `/conversations/:id` | Obtener detalles de conversación |
| `PUT` | `/conversations/:id` | Actualizar conversación |
| `DELETE` | `/conversations/:id` | Eliminar conversación |
| `POST` | `/conversations/:id/participants` | Agregar participante |
| `DELETE` | `/conversations/:id/participants/:userId` | Eliminar participante |
| `GET` | `/conversations/:id/messages` | Listar mensajes de conversación |
| `POST` | `/conversations/:id/messages` | Enviar mensaje |
| `PUT` | `/messages/:id` | Editar mensaje |
| `DELETE` | `/messages/:id` | Eliminar mensaje |
| `POST` | `/messages/:id/reactions` | Agregar reacción |
| `DELETE` | `/messages/:id/reactions` | Eliminar reacción |
| `POST` | `/messages/:id/attachments` | Subir archivo adjunto |
| `GET` | `/attachments/:id/download` | Descargar archivo |

### 📝 Ejemplos de Uso

#### Crear Conversación
```bash
POST /communications/conversations
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Proyecto Final - Equipo A",
  "description": "Conversación para coordinar el proyecto final",
  "type": "group",
  "participantIds": ["user-1", "user-2", "user-3"]
}
```

#### Enviar Mensaje
```bash
POST /communications/conversations/{id}/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "¡Hola equipo! ¿Cómo van con sus partes?",
  "type": "text",
  "metadata": {
    "priority": "normal"
  }
}
```

---

## 🔌 WebSocket - Eventos en Tiempo Real

### 🌐 Conexión
```javascript
const socket = io('ws://localhost:3000/communications', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 📡 Eventos del Cliente → Servidor

| Evento | Datos | Descripción |
|--------|-------|-------------|
| `join_conversation` | `{conversationId}` | Unirse a conversación |
| `leave_conversation` | `{conversationId}` | Abandonar conversación |
| `send_message` | `{conversationId, content, type}` | Enviar mensaje |
| `typing_start` | `{conversationId}` | Comenzar a escribir |
| `typing_stop` | `{conversationId}` | Dejar de escribir |
| `add_reaction` | `{messageId, reactionType}` | Agregar reacción |
| `remove_reaction` | `{messageId, reactionType}` | Quitar reacción |

### 📡 Eventos del Servidor → Cliente

| Evento | Datos | Descripción |
|--------|-------|-------------|
| `connection_established` | `{user, timestamp}` | Conexión confirmada |
| `user_joined_conversation` | `{userId, conversationId}` | Usuario se unió |
| `user_left_conversation` | `{userId, conversationId}` | Usuario se fue |
| `new_message` | `{message}` | Nuevo mensaje recibido |
| `user_typing` | `{userId, isTyping}` | Estado de escritura |
| `reaction_added` | `{messageId, reaction}` | Reacción agregada |
| `reaction_removed` | `{messageId, reactionId}` | Reacción eliminada |
| `user_presence_changed` | `{userId, isOnline}` | Cambio de presencia |

---

## 💾 Modelo de Datos

### 🗂️ Esquema de Base de Datos

#### Tabla: `conversations`
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'direct',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB
);
```

#### Tabla: `messages`
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text',
    parent_message_id UUID REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB
);
```

#### Tabla: `message_reactions`
```sql
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id),
    user_id UUID REFERENCES users(id),
    reaction_type VARCHAR(50) NOT NULL,
    emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction_type)
);
```

#### Tabla: `message_attachments`
```sql
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);
```

---

## 🛡️ Seguridad y Validación

### 🔐 Autenticación
- **REST API**: Bearer Token JWT en headers
- **WebSocket**: Token JWT en auth object durante handshake
- **Validación**: Verificación de usuario en cada operación

### ✅ Validación de Datos
```typescript
// Ejemplo de DTO con validaciones
export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsEnum(ConversationType)
  type: ConversationType;

  @IsArray()
  @IsUUID(4, { each: true })
  participantIds: string[];
}
```

### 🔒 Autorización
- Verificación de pertenencia a conversaciones
- Control de permisos por rol
- Validación de propietario para operaciones sensibles

---

## 🚀 Instalación y Configuración

### 📦 Dependencias Requeridas
```bash
# Dependencias principales
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Para desarrollo
npm install @types/socket.io --save-dev
```

### ⚙️ Configuración

#### 1. Variables de Entorno
```bash
# WebSocket Configuration
WEBSOCKET_PORT=3001
WEBSOCKET_CORS_ORIGIN=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h
```

#### 2. Configuración del Módulo
```typescript
// app.module.ts
@Module({
  imports: [
    // ... otros módulos
    CommunicationsModule,
  ],
})
export class AppModule {}
```

---

## 🧪 Testing

### 🧾 Casos de Prueba Sugeridos

#### REST API Tests
```typescript
describe('CommunicationsController', () => {
  it('should create conversation', async () => {
    const createDto = {
      title: 'Test Conversation',
      type: 'group',
      participantIds: ['user1', 'user2']
    };
    
    const result = await controller.createConversation(createDto, mockUser);
    expect(result.success).toBe(true);
  });
});
```

#### WebSocket Tests
```typescript
describe('CommunicationsGateway', () => {
  it('should handle message sending', async () => {
    const messageDto = {
      conversationId: 'conv-1',
      content: 'Test message',
      type: 'text'
    };
    
    const result = await gateway.handleSendMessage(mockClient, messageDto);
    expect(result.success).toBe(true);
  });
});
```

---

## 📊 Monitoreo y Métricas

### 📈 Métricas Recomendadas

#### WebSocket Metrics
- **Conexiones Activas**: Número de usuarios conectados
- **Mensajes por Segundo**: Throughput de mensajes
- **Latencia**: Tiempo de respuesta promedio
- **Errores de Conexión**: Tasa de fallos

#### API Metrics
- **Tiempo de Respuesta**: Por endpoint
- **Tasa de Error**: Errores 4xx/5xx
- **Throughput**: Requests por segundo
- **Uso de Recursos**: CPU/Memoria

### 📋 Logs Estructurados
```typescript
this.logger.log('User connected to WebSocket', {
  userId: client.user.id,
  socketId: client.id,
  timestamp: new Date().toISOString(),
  conversationId: data.conversationId
});
```

---

## 🔧 Mantenimiento

### 🔄 Actualizaciones Regulares
1. **Dependencias**: Mantener librerías actualizadas
2. **Seguridad**: Revisar tokens JWT y permisos
3. **Performance**: Monitorear queries de base de datos
4. **Logs**: Limpiar logs antiguos regularmente

### 🐛 Troubleshooting Común

#### Problemas de Conexión WebSocket
```bash
# Verificar puertos
netstat -an | grep 3000

# Verificar logs
tail -f backend.log | grep WebSocket
```

#### Problemas de Performance
```sql
-- Verificar queries lentas
SELECT * FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY query_start;
```

---

## 🎯 Próximas Mejoras

### 🔮 Roadmap Técnico
1. **Push Notifications**: Notificaciones móviles
2. **Message Threading**: Hilos de conversación avanzados
3. **File Sharing**: Mejoras en compartir archivos
4. **Voice Messages**: Mensajes de voz
5. **Video Calls**: Integración de videollamadas
6. **Message Encryption**: Cifrado end-to-end
7. **Bot Integration**: Chatbots automáticos
8. **Message Search**: Búsqueda avanzada en mensajes

### 📊 Optimizaciones
- **Caching**: Redis para mensajes frecuentes
- **Database**: Índices optimizados
- **CDN**: Para archivos adjuntos
- **Load Balancing**: Para WebSocket scaling

---

## 📞 Soporte

### 🆘 Contacto Técnico
- **Documentación**: Este archivo
- **Código Fuente**: `/backend/src/modules/communications/`
- **Ejemplos**: `client-example.js`
- **Swagger**: `http://localhost:3000/api` (cuando el servidor esté corriendo)

### 📚 Recursos Adicionales
- [NestJS WebSocket Documentation](https://docs.nestjs.com/websockets/gateways)
- [Socket.IO Documentation](https://socket.io/docs/)
- [TypeORM Relations](https://typeorm.io/relations)

---

*🎉 Sistema de Comunicaciones v1.0 - Implementado con principios SOLID y mejores prácticas*