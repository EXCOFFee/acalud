/**
 * 💬 MÓDULO DE COMUNICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Módulo principal que integra todo el sistema de comunicaciones:
 * - Conversaciones (chats, foros, anuncios)
 * - Mensajes con multimedia
 * - Reacciones y interacciones
 * - Archivos adjuntos
 * - WebSockets para tiempo real
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de configurar comunicaciones
 * - OCP: Extensible para nuevas funcionalidades
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por componente
 * - DIP: Usa inyección de dependencias
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// 📁 Entidades del sistema de comunicaciones
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageAttachment } from './message-attachment.entity';

// 🏗️ Servicios, controladores y gateways
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsGateway } from './communications.gateway';

// 📡 Otros módulos necesarios
import { UsersModule } from '../users/users.module';
import { ClassroomsModule } from '../classrooms/classrooms.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo principal de comunicaciones
 * 
 * @description Configuración completa del sistema de comunicaciones
 * incluyendo entidades, servicios, controladores y dependencias.
 * 
 * Este módulo proporciona:
 * - APIs REST para gestión de conversaciones y mensajes
 * - Sistema de reacciones y archivos adjuntos
 * - Integración con usuarios y aulas
 * - Eventos para comunicación entre módulos
 * - Preparación para WebSockets en tiempo real
 * 
 * @example
 * ```typescript
 * // Importar en app.module.ts
 * @Module({
 *   imports: [
 *     CommunicationsModule,
 *     // ... otros módulos
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [
    // 🗃️ Configuración de TypeORM para las entidades
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      MessageReaction,
      MessageAttachment,
    ]),
    
    // 📡 Módulo de eventos para comunicación entre módulos
    EventEmitterModule,
    
    // 👥 Módulos relacionados necesarios
    UsersModule,
    ClassroomsModule,
    
    // 🔐 Módulo de autenticación para guards
    AuthModule,
  ],
  
  // 🎮 Controladores que exponen las APIs REST
  controllers: [
    CommunicationsController,
  ],
  
  // 🔧 Servicios con lógica de negocio y gateways WebSocket
  providers: [
    CommunicationsService,
    CommunicationsGateway,
  ],
  
  // 📤 Servicios exportados para uso en otros módulos
  exports: [
    CommunicationsService,
    TypeOrmModule, // Para que otros módulos puedan usar las entidades
  ],
})
export class CommunicationsModule {
  /**
   * Configuración del módulo al inicializar
   * 
   * @description Se ejecuta cuando el módulo se carga,
   * útil para configuraciones adicionales o logging.
   */
  constructor() {
    console.log('💬 Módulo de Comunicaciones inicializado exitosamente');
    console.log('✅ Entidades registradas: Conversation, Message, MessageReaction, MessageAttachment');
    console.log('✅ Servicios configurados: CommunicationsService');
    console.log('✅ Gateway WebSocket: CommunicationsGateway (/communications)');
    console.log('✅ APIs REST disponibles en: /api/communications');
    console.log('� WebSocket disponible en: ws://localhost:3000/communications');
    console.log('�🚀 Sistema de comunicaciones completo listo para usar');
  }
}