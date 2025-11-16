import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ResourceNotFoundException } from '../exceptions/business.exception';

describe('GlobalExceptionFilter', () => {
  const createArgumentsHost = (response: any, requestOverrides: Record<string, any> = {}): ArgumentsHost => {
    const request = {
      method: 'GET',
      url: '/test',
      headers: { 'user-agent': 'jest' },
      ...requestOverrides,
    };

    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  };

  const createResponseMock = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as any;
  };

  it('debería formatear BusinessException con metadatos adicionales', () => {
    const filter = new GlobalExceptionFilter();
    const responseMock = createResponseMock();
    const host = createArgumentsHost(responseMock, {
      url: '/actividades/1',
      correlationId: 'trace-123',
    });

    const exception = new ResourceNotFoundException('Actividad', '1');

    filter.catch(exception, host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(responseMock.status().json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'RESOURCE_NOT_FOUND',
        path: '/actividades/1',
        correlationId: 'trace-123',
      }),
    );
  });

  it('debería formatear HttpException estándar', () => {
    const filter = new GlobalExceptionFilter();
    const responseMock = createResponseMock();
    const host = createArgumentsHost(responseMock, {
      url: '/actividades',
    });

    filter.catch(new HttpException('Datos inválidos', HttpStatus.BAD_REQUEST), host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(responseMock.status().json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Datos inválidos',
        errorCode: 'BAD_REQUEST',
      }),
    );
  });

  it('debería manejar errores genéricos desconocidos', () => {
    const filter = new GlobalExceptionFilter();
    const responseMock = createResponseMock();
    const host = createArgumentsHost(responseMock, {
      url: '/actividades',
    });

    filter.catch(new Error('Boom!'), host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(responseMock.status().json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Boom!',
        errorCode: 'INTERNAL_SERVER_ERROR',
      }),
    );
  });
});
