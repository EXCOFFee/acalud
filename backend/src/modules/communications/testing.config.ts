/**
 * 🧪 GUÍA DE TESTING - SISTEMA DE COMUNICACIONES
 * 
 * Este archivo contiene ejemplos y configuraciones para testing
 * del sistema de comunicaciones una vez implementado.
 * 
 * INSTRUCCIONES DE USO:
 * 1. Una vez que las clases estén implementadas, usar estos helpers
 * 2. Instalar dependencias: npm install --save-dev @nestjs/testing
 * 3. Ejecutar: npm run test communications
 * 
 * COBERTURA DE TESTING:
 * ✅ Datos mock para todas las entidades
 * ✅ Helpers de validación
 * ✅ Configuración de WebSocket testing
 * ✅ Casos de prueba estructurados
 */

// =============================================================================
// 🎭 DATOS MOCK PARA TESTING
// =============================================================================

/**
 * 👤 Usuario mock para todas las pruebas
 */
export const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User',
  role: 'student',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  profile: null,
  classrooms: [],
  activities: [],
  notifications: [],
  gamificationPoints: [],
  achievements: [],
};

/**
 * 💬 Conversación mock para testing
 */
export const mockConversation = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  title: 'Test Conversation',
  description: 'Una conversación de prueba',
  type: 'group',
  createdBy: mockUser.id,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  isActive: true,
  metadata: { testMode: true },
  creator: mockUser,
  participants: [mockUser],
  messages: [],
};

/**
 * 💌 Mensaje mock para testing
 */
export const mockMessage = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  conversationId: mockConversation.id,
  senderId: mockUser.id,
  content: 'Este es un mensaje de prueba',
  type: 'text',
  parentMessageId: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  isEdited: false,
  isDeleted: false,
  metadata: { testMessage: true },
  conversation: mockConversation,
  sender: mockUser,
  parentMessage: null,
  replies: [],
  reactions: [],
  attachments: [],
};

/**
 * 👍 Reacción mock para testing
 */
export const mockReaction = {
  id: '880e8400-e29b-41d4-a716-446655440003',
  messageId: mockMessage.id,
  userId: mockUser.id,
  reactionType: 'like',
  emoji: '👍',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  message: mockMessage,
  user: mockUser,
};

/**
 * 📎 Archivo adjunto mock para testing
 */
export const mockAttachment = {
  id: '990e8400-e29b-41d4-a716-446655440004',
  messageId: mockMessage.id,
  filename: 'test-file.pdf',
  originalName: 'documento-test.pdf',
  mimeType: 'application/pdf',
  fileSize: 1024000,
  filePath: '/uploads/test-file.pdf',
  uploadedAt: new Date('2024-01-01T00:00:00Z'),
  metadata: { uploadedBy: mockUser.id },
};

// =============================================================================
// 📊 DATOS DE PRUEBA PARA DTOs
// =============================================================================

/**
 * 📝 Datos para crear conversación
 */
export const createConversationTestData = {
  title: 'Conversación de Testing',
  description: 'Esta es una conversación creada durante las pruebas',
  type: 'group',
  participantIds: [mockUser.id],
  metadata: { 
    testEnvironment: true,
    createdBy: 'automated-test'
  },
};

/**
 * 💬 Datos para enviar mensaje
 */
export const sendMessageTestData = {
  content: 'Mensaje de prueba automatizada',
  type: 'text',
  parentMessageId: null,
  metadata: {
    testMessage: true,
    automated: true,
  },
};

/**
 * 🔌 Datos para WebSocket
 */
export const wsJoinConversationTestData = {
  conversationId: mockConversation.id,
};

/**
 * 👍 Datos para agregar reacción
 */
export const addReactionTestData = {
  messageId: mockMessage.id,
  reactionType: 'like',
  emoji: '👍',
};

// =============================================================================
// 🔧 HELPERS PARA TESTING
// =============================================================================

/**
 * 🏗️ Factory para crear mock de Repository
 */
export function createMockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  };
}

/**
 * 🔑 Mock del JwtService
 */
export const mockJwtService = {
  sign: jest.fn(() => 'test-jwt-token'),
  verify: jest.fn(() => ({ 
    sub: mockUser.id, 
    email: mockUser.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  })),
  decode: jest.fn(() => ({ 
    sub: mockUser.id, 
    email: mockUser.email 
  })),
};

/**
 * 🌐 Mock de cliente WebSocket
 */
export function createMockSocketClient(userId: string = mockUser.id) {
  return {
    id: `socket-${userId}`,
    user: { ...mockUser, id: userId },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
    broadcast: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    },
    handshake: {
      auth: { token: 'test-token' },
    },
  };
}

/**
 * 🌐 Mock del servidor WebSocket
 */
export function createMockSocketServer() {
  return {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    in: jest.fn().mockReturnThis(),
    sockets: {
      adapter: {
        rooms: new Map(),
      },
    },
  };
}

// =============================================================================
// ✅ HELPERS DE VALIDACIÓN
// =============================================================================

/**
 * 🔍 Validar UUID
 */
export function expectValidUUID(value: string) {
  expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

/**
 * ⏰ Validar timestamp
 */
export function expectValidTimestamp(value: Date | string) {
  const date = new Date(value);
  expect(date.getTime()).not.toBeNaN();
  expect(date.getTime()).toBeGreaterThan(0);
}

/**
 * 📊 Validar respuesta API
 */
type BasicApiResponse = {
  success: boolean;
  data?: unknown;
  message?: unknown;
  error?: unknown;
  [key: string]: unknown;
};

export function validateApiResponse(
  response: BasicApiResponse,
  expectedSuccess: boolean = true,
) {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('message');
  expect(response.success).toBe(expectedSuccess);

  if (expectedSuccess) {
    expect(response.data).toBeDefined();
  } else {
    expect(response).toHaveProperty('error');
  }

  return response;
}

/**
 * 💬 Validar estructura de conversación
 */
interface TestConversation {
  id: string;
  title: string;
  type: string;
  createdAt: Date | string;
  [key: string]: unknown;
}

export function expectValidConversation(conversation: TestConversation) {
  expect(conversation).toHaveProperty('id');
  expect(conversation).toHaveProperty('title');
  expect(conversation).toHaveProperty('type');
  expect(conversation).toHaveProperty('createdAt');
  expectValidUUID(conversation.id);
  expectValidTimestamp(conversation.createdAt);
}

/**
 * 💌 Validar estructura de mensaje
 */
interface TestMessage {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  [key: string]: unknown;
}

export function expectValidMessage(message: TestMessage) {
  expect(message).toHaveProperty('id');
  expect(message).toHaveProperty('content');
  expect(message).toHaveProperty('senderId');
  expect(message).toHaveProperty('conversationId');
  expectValidUUID(message.id);
  expectValidUUID(message.senderId);
  expectValidUUID(message.conversationId);
}

/**
 * 🌐 Validar evento WebSocket
 */
type EmitFunction = (...args: unknown[]) => unknown;

interface WebSocketClient {
  emit: EmitFunction;
}

export function validateWebSocketEvent(
  client: WebSocketClient,
  eventName: string,
  expectedData?: Record<string, unknown>,
) {
  expect(client.emit).toHaveBeenCalledWith(
    eventName,
    expectedData ? expect.objectContaining(expectedData) : expect.any(Object)
  );
}

// =============================================================================
// 🧪 CASOS DE PRUEBA ESTRUCTURADOS
// =============================================================================

/**
 * 📋 Template para testing del Controller
 */
export const controllerTestCases = {
  createConversation: {
    description: 'should create a new conversation',
    input: createConversationTestData,
    expected: {
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        title: createConversationTestData.title,
        type: createConversationTestData.type,
      }),
    },
  },
  
  sendMessage: {
    description: 'should send a message to conversation',
    input: sendMessageTestData,
    expected: {
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        content: sendMessageTestData.content,
        type: sendMessageTestData.type,
      }),
    },
  },
  
  addReaction: {
    description: 'should add reaction to message',
    input: addReactionTestData,
    expected: {
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        reactionType: addReactionTestData.reactionType,
      }),
    },
  },
};

/**
 * 🌐 Template para testing del Gateway
 */
export const gatewayTestCases = {
  handleConnection: {
    description: 'should handle client connection',
    expected: {
      event: 'connection_established',
      data: expect.objectContaining({
        user: expect.any(Object),
        timestamp: expect.any(String),
      }),
    },
  },
  
  joinConversation: {
    description: 'should join user to conversation',
    input: wsJoinConversationTestData,
    expected: {
      success: true,
      data: expect.objectContaining({
        conversationId: wsJoinConversationTestData.conversationId,
      }),
    },
  },
  
  sendMessage: {
    description: 'should broadcast message to conversation participants',
    input: sendMessageTestData,
    expected: {
      event: 'new_message',
      data: expect.objectContaining({
        content: sendMessageTestData.content,
      }),
    },
  },
};

// =============================================================================
// 🎯 UTILIDADES AVANZADAS DE TESTING
// =============================================================================

/**
 * ⏱️ Helper para medir performance
 */
export class PerformanceTestHelper {
  private startTime: number = 0;

  startTimer() {
    this.startTime = Date.now();
  }

  endTimer(): number {
    return Date.now() - this.startTime;
  }

  expectOperationTime(maxTimeMs: number) {
    const elapsed = this.endTimer();
    expect(elapsed).toBeLessThan(maxTimeMs);
    return elapsed;
  }
}

/**
 * 🔄 Helper para testing asíncrono
 */
export function createAsyncDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🧹 Helper para limpiar mocks
 */
export function clearAllMocks() {
  jest.clearAllMocks();
}

/**
 * 🚨 Helper para generar errores de prueba
 */
export function createTestError(message: string = 'Test error'): Error {
  return new Error(message);
}

// =============================================================================
// 🎉 EXPORT DE CONFIGURACIÓN COMPLETA
// =============================================================================

export const CommunicationsTestingConfig = {
  // Datos mock
  mockUser,
  mockConversation,
  mockMessage,
  mockReaction,
  mockAttachment,
  
  // Datos de prueba
  createConversationTestData,
  sendMessageTestData,
  wsJoinConversationTestData,
  addReactionTestData,
  
  // Factories y mocks
  createMockRepository,
  mockJwtService,
  createMockSocketClient,
  createMockSocketServer,
  
  // Helpers de validación
  expectValidUUID,
  expectValidTimestamp,
  validateApiResponse,
  expectValidConversation,
  expectValidMessage,
  validateWebSocketEvent,
  
  // Casos de prueba
  controllerTestCases,
  gatewayTestCases,
  
  // Utilidades
  PerformanceTestHelper,
  createAsyncDelay,
  clearAllMocks,
  createTestError,
};

export default CommunicationsTestingConfig;

/**
 * 🎯 INSTRUCCIONES FINALES:
 * 
 * 1. Para usar este archivo, primero implementa las clases principales
 * 2. Instala las dependencias de testing: npm install --save-dev @nestjs/testing
 * 3. Crea archivos de test individuales usando estos helpers
 * 4. Ejecuta las pruebas con: npm run test
 * 
 * 📁 Estructura de archivos de test recomendada:
 * - communications.controller.spec.ts
 * - communications.service.spec.ts
 * - communications.gateway.spec.ts
 * - communications.integration.spec.ts
 * 
 * 📝 EJEMPLOS DE USO:
 * 
 * EJEMPLO 1: Testing del Controller
 * ```typescript
 * describe('CommunicationsController', () => {
 *   let controller: CommunicationsController;
 *   
 *   beforeEach(async () => {
 *     // Configurar módulo de testing
 *   });
 * 
 *   it('should create conversation', async () => {
 *     const result = await controller.createConversation(
 *       createConversationTestData,
 *       mockUser
 *     );
 *     
 *     validateApiResponse(result, true);
 *     expectValidConversation(result.data);
 *   });
 * });
 * ```
 * 
 * EJEMPLO 2: Testing del Gateway WebSocket
 * ```typescript
 * describe('CommunicationsGateway', () => {
 *   let gateway: CommunicationsGateway;
 *   let mockClient: any;
 * 
 *   beforeEach(() => {
 *     mockClient = createMockSocketClient();
 *   });
 * 
 *   it('should join conversation', async () => {
 *     const result = await gateway.handleJoinConversation(
 *       mockClient,
 *       wsJoinConversationTestData
 *     );
 *     
 *     expect(result.success).toBe(true);
 *     validateWebSocketEvent(mockClient, 'user_joined_conversation');
 *   });
 * });
 * ```
 */