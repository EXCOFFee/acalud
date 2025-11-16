import 'reflect-metadata';
import { Test } from '@nestjs/testing';

// Configuración global para tests
beforeAll(async () => {
  // Configuración de timezone
  process.env.TZ = 'UTC';
});

// Mock global para logger (silencia salidas pero conserva métodos estáticos)
jest.mock('@nestjs/common', () => {
  const actualCommon = jest.requireActual('@nestjs/common');
  const { Logger: ActualLogger } = jest.requireActual('@nestjs/common/services/logger.service');

  class SilentLogger extends ActualLogger {
    constructor(...args: ConstructorParameters<typeof ActualLogger>) {
      super(...args);
    }

    log = jest.fn();
    error = jest.fn();
    warn = jest.fn();
    debug = jest.fn();
    verbose = jest.fn();
  }

  SilentLogger.log = jest.fn();
  SilentLogger.error = jest.fn();
  SilentLogger.warn = jest.fn();
  SilentLogger.debug = jest.fn();
  SilentLogger.verbose = jest.fn();

  return {
    ...actualCommon,
    Logger: SilentLogger,
  };
});

// Helper para crear módulos de testing
export const createTestingModule = async (metadata: any) => {
  return Test.createTestingModule(metadata).compile();
};

// Mock para repositorios
export const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  findWithFilters: jest.fn(),
  findByInviteCode: jest.fn(),
  addStudent: jest.fn(),
  removeStudent: jest.fn(),
  getStudentCount: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  })),
});

// Mock para servicios comunes
export const createMockService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});
